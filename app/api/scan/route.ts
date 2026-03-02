/**
 * TASH — Card Scan API
 *
 * POST /api/scan
 * Accepts a base64-encoded card image, sends it to Gemini for AI identification,
 * and returns structured card data plus an optional matched market symbol.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getMarketCards } from "@/lib/db/cards";
import { fetchPSAImage, uploadCardImageToStorage, uploadRawScanToStorage } from "@/lib/psa";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_GENERATIVE_API_KEY ?? "");

function buildPrompt(certNumberLocalScan?: string) {
  const certInstruction = certNumberLocalScan ?
    `\n\nCRITICAL: A barcode scanner has already extracted the PSA certification number as "${certNumberLocalScan}". You MUST output this exact string for the "certNumber" field.` :
    "";

  return `Analyze this trading card image and return ONLY a JSON object — no markdown, no code fences, no explanation.${certInstruction}

Return exactly this structure:
{
  "name": "card name (e.g. Charizard Holo)",
  "set": "set name (e.g. Base Set)",
  "year": 1999,
  "cardNumber": "4/102",
  "category": "pokemon",
  "estimatedGrade": 9,
  "certNumber": "12345678",
  "gradeRange": [8, 9],
  "confidence": 0.91,
  "condition": {
    "corners": "sharp",
    "surfaces": "clean",
    "centering": "well-centered",
    "edges": "clean"
  },
  "notes": "Brief observations about grade potential",
  "isFullSlabVisible": true
}

Valid values:
- category: "pokemon" or "sports"
- estimatedGrade: integer 1–10
- certNumber: string of the PSA/BGS certification number if it is a graded slab, otherwise null
- gradeRange: [low, high] pair
- confidence: 0.0–1.0
- corners: "sharp" | "slightly worn" | "worn" | "heavily worn"
- surfaces: "clean" | "light scratches" | "scratched" | "heavily scratched"
- centering: "well-centered" | "slightly off-center" | "off-center" | "severely off-center"
- edges: "clean" | "slightly worn" | "worn" | "heavily worn"
- isFullSlabVisible: boolean. Set to true ONLY if the entire PSA slab (both the label at the top and the full trading card body) is clearly visible in the image. If it is cut off, poorly framed, or zoomed in too much, set to false.

If the image is unclear, return your best estimate with a low confidence value. Return ONLY the JSON.`;
}




export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, certNumberLocalScan } = await req.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "Missing imageBase64 or mimeType" },
        { status: 400 }
      );
    }

    const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported image type" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
      { text: buildPrompt(certNumberLocalScan) },
    ]);

    const rawText = result.response.text();

    // Strip markdown code fences if present
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let card;
    try {
      card = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: rawText },
        { status: 422 }
      );
    }

    // Fuzzy-match card name to a known ASSET symbol for live pricing
    const cardNameLower = (card.name ?? "").toLowerCase();
    const dbCards = await getMarketCards() ?? [];
    const matchedAsset = dbCards.find((a) => {
      const assetName = a.name.toLowerCase();
      const firstWord = assetName.split(" ")[0];
      return (
        assetName.includes(cardNameLower) ||
        cardNameLower.includes(assetName) ||
        (firstWord.length > 3 && cardNameLower.includes(firstWord))
      );
    });

    // Sub-routine to get the best image URL: 
    // 1. Try PSA API and upload to Supabase if cert exists
    // 2. Fall back to existing lookupCardImage logic
    async function determineImageUrl(cardData: any): Promise<string | null> {
      if (cardData.certNumber) {
        console.log(`Attempting to fetch PSA image for cert ${cardData.certNumber}`);
        const psaImageUrl = await fetchPSAImage(cardData.certNumber);
        if (psaImageUrl) {
          console.log(`Found PSA image, uploading to Supabase...`);
          const supabaseUrl = await uploadCardImageToStorage(psaImageUrl, cardData.certNumber);
          if (supabaseUrl) {
            console.log(`Successfully uploaded PSA image: ${supabaseUrl}`);
            return supabaseUrl;
          }
        }
      }
      return null;
    }

    // Look up image, pricing, and upload raw scan in parallel
    const [imageUrl, pricing, rawImageUrl] = await Promise.all([
      determineImageUrl(card),
      Promise.resolve(null),
      uploadRawScanToStorage(imageBase64, mimeType),
    ]);

    return NextResponse.json({
      card,
      matchedSymbol: matchedAsset?.symbol ?? null,
      imageUrl,
      rawImageUrl,
      pricing,
    });
  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
