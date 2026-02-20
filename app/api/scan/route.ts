/**
 * LEDGER — Card Scan API
 *
 * POST /api/scan
 * Accepts a base64-encoded card image, sends it to Claude for AI identification,
 * and returns structured card data plus an optional matched market symbol.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ASSETS } from "@/lib/market-data";

const client = new Anthropic();

const PROMPT = `Analyze this trading card image and return ONLY a JSON object — no markdown, no code fences, no explanation.

Return exactly this structure:
{
  "name": "card name (e.g. Charizard Holo)",
  "set": "set name (e.g. Base Set)",
  "year": 1999,
  "cardNumber": "4/102",
  "category": "pokemon",
  "estimatedGrade": 9,
  "gradeRange": [8, 9],
  "confidence": 0.91,
  "condition": {
    "corners": "sharp",
    "surfaces": "clean",
    "centering": "well-centered",
    "edges": "clean"
  },
  "notes": "Brief observations about grade potential"
}

Valid values:
- category: "pokemon" or "sports"
- estimatedGrade: integer 1–10
- gradeRange: [low, high] pair
- confidence: 0.0–1.0
- corners: "sharp" | "slightly worn" | "worn" | "heavily worn"
- surfaces: "clean" | "light scratches" | "scratched" | "heavily scratched"
- centering: "well-centered" | "slightly off-center" | "off-center" | "severely off-center"
- edges: "clean" | "slightly worn" | "worn" | "heavily worn"

If the image is unclear, return your best estimate with a low confidence value. Return ONLY the JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

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

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: PROMPT,
            },
          ],
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

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
    const matchedAsset = ASSETS.find((a) => {
      const assetName = a.name.toLowerCase();
      const firstWord = assetName.split(" ")[0];
      return (
        assetName.includes(cardNameLower) ||
        cardNameLower.includes(assetName) ||
        (firstWord.length > 3 && cardNameLower.includes(firstWord))
      );
    });

    return NextResponse.json({
      card,
      matchedSymbol: matchedAsset?.symbol ?? null,
    });
  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
