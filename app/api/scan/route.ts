/**
 * TASH — Card Scan API
 *
 * POST /api/scan
 * Accepts a base64-encoded card image, sends it to Claude for AI identification,
 * and returns structured card data plus an optional matched market symbol.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getMarketCards } from "@/lib/db/cards";

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
  "certNumber": "12345678",
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
- certNumber: string of the PSA/BGS certification number if it is a graded slab, otherwise null
- gradeRange: [low, high] pair
- confidence: 0.0–1.0
- corners: "sharp" | "slightly worn" | "worn" | "heavily worn"
- surfaces: "clean" | "light scratches" | "scratched" | "heavily scratched"
- centering: "well-centered" | "slightly off-center" | "off-center" | "severely off-center"
- edges: "clean" | "slightly worn" | "worn" | "heavily worn"

If the image is unclear, return your best estimate with a low confidence value. Return ONLY the JSON.`;

// ─────────────────────────────────────────────────────────
// Google Cloud Vision OCR
// ─────────────────────────────────────────────────────────

async function detectTextWithGoogleVision(base64Image: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }),
    });

    const data = await response.json();
    return data.responses?.[0]?.fullTextAnnotation?.text || null;
  } catch (err) {
    console.error("Google Vision API error:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Card image lookup
// ─────────────────────────────────────────────────────────

interface CardData {
  name?: string;
  set?: string;
  cardNumber?: string | null;
  category?: string;
  year?: number;
}

export interface CardPricing {
  low: string | null;
  mid: string | null;
  high: string | null;
  labels: [string, string, string];
  source: string;
}

async function lookupCardImage(card: CardData): Promise<string | null> {
  try {
    if (card.category === "pokemon") {
      return await lookupPokemonImage(card);
    }
    // Sports cards: no public image API — return null (falls back to user's photo)
    return null;
  } catch {
    return null;
  }
}

async function lookupPokemonImage(card: CardData): Promise<string | null> {
  const name = card.name?.split(" ")[0]; // e.g. "Charizard" from "Charizard Holo"
  if (!name) return null;

  // Build query: search by name, optionally narrow by card number
  const number = card.cardNumber?.replace(/\/.+$/, "").trim(); // "4" from "4/102"
  const q = number
    ? `name: "${name}" number:${number} `
    : `name: "${name}"`;

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (process.env.POKEMON_TCG_API_KEY) {
    headers["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=10&select=id,name,number,set,images`,
      { headers, signal: controller.signal, next: { revalidate: 86400 } }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) return null;

  const data = await res.json();
  const cards: Array<{
    name: string;
    set?: { name?: string };
    images?: { large?: string; small?: string };
  }> = data.data ?? [];

  if (!cards.length) return null;

  // Prefer a card whose set name matches what Claude reported
  const setName = (card.set ?? "").toLowerCase();
  const match =
    cards.find((c) => c.set?.name?.toLowerCase().includes(setName)) ?? cards[0];

  return match.images?.large ?? match.images?.small ?? null;
}

// ─────────────────────────────────────────────────────────
// Card pricing — dispatches to JustTCG (Pokemon) or CardSight (sports)
// ─────────────────────────────────────────────────────────

async function lookupPricing(card: CardData): Promise<CardPricing | null> {
  if (card.category === "pokemon") return lookupPokemonPricing(card);
  if (card.category === "sports") return lookupSportsPricing(card);
  return null;
}

// ── JustTCG — Pokemon ─────────────────────────────────────

type JustTCGSet = { id: string; name: string };
type JustTCGVariant = { condition: string; printing: string; price: number };
type JustTCGCard = { name: string; variants?: JustTCGVariant[] };

async function fetchWithTimeout(url: string, headers: Record<string, string>, ttl = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ttl);
  try {
    return await fetch(url, { headers, signal: controller.signal, next: { revalidate: 3600 } });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveJustTCGSetId(setName: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      "https://api.justtcg.com/v1/sets?game=pokemon",
      { "x-api-key": apiKey },
      8000
    );
    if (!res.ok) return null;
    const data = await res.json();
    const sets: JustTCGSet[] = data.data ?? [];

    const needle = setName.toLowerCase();
    // Exact match first, then partial (e.g. "Evolving Skies" matches "SWSH07: Evolving Skies")
    return (
      sets.find((s) => s.name.toLowerCase() === needle)?.id ??
      sets.find((s) => s.name.toLowerCase().includes(needle))?.id ??
      sets.find((s) => needle.includes(s.name.toLowerCase().replace(/^swsh\d+:\s*/i, "").replace(/^sv\d+:\s*/i, "")))?.id ??
      null
    );
  } catch {
    return null;
  }
}

async function lookupPokemonPricing(card: CardData): Promise<CardPricing | null> {
  const apiKey = process.env.JUSTTCG_API_KEY;
  if (!apiKey || !card.name || !card.set) return null;

  try {
    // Step 1: resolve the real JustTCG set ID
    const setId = await resolveJustTCGSetId(card.set, apiKey);
    if (!setId) return null;

    // Step 2: search cards in that set by name (q= does exact text search; name= is ignored by the API)
    const cardName = card.name.split(" ")[0]; // "Glaceon" from "Glaceon VMAX"
    const params = new URLSearchParams({ game: "pokemon", set: setId, q: card.name, limit: "10" });

    const res = await fetchWithTimeout(
      `https://api.justtcg.com/v1/cards?${params}`,
      { "x-api-key": apiKey }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const cards: JustTCGCard[] = data.data ?? [];

    // Filter to individual cards (non-sealed: Near Mint / Lightly Played variants exist)
    const singles = cards.filter((c) =>
      c.variants?.some((v) => v.condition.toLowerCase().startsWith("near mint"))
    );
    if (!singles.length) return null;

    // Best match: q= already filters to relevant cards; prefer exact name, then first result
    const nameLower = card.name.toLowerCase();
    const match =
      singles.find((c) => c.name.toLowerCase() === nameLower) ??
      singles.find((c) => c.name.toLowerCase().includes(nameLower)) ??
      singles.find((c) => c.name.toLowerCase().includes(cardName.toLowerCase())) ??
      singles[0];

    const variants = match.variants ?? [];
    const findPrice = (prefix: string) =>
      variants.find((v) => v.condition.toLowerCase().startsWith(prefix))?.price ?? null;

    const nm = findPrice("near mint");
    const lp = findPrice("lightly");
    const mp = findPrice("moderately");

    if (!nm && !lp && !mp) return null;

    return {
      low: mp != null ? String(mp) : null,
      mid: lp != null ? String(lp) : null,
      high: nm != null ? String(nm) : null,
      labels: ["Mod. Played", "Lightly Played", "Near Mint"],
      source: "JustTCG",
    };
  } catch {
    return null;
  }
}

// ── CardSight — Sports ────────────────────────────────────

async function lookupSportsPricing(card: CardData): Promise<CardPricing | null> {
  const apiKey = process.env.CARDSIGHT_API_KEY;
  if (!apiKey || !card.name) return null;

  try {
    const params = new URLSearchParams({ take: "10" });
    params.set("name", card.name);
    if (card.year) params.set("year", String(card.year));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(`https://api.cardsight.ai/v1/catalog/cards?${params}`, {
        headers: { "X-Api-Key": apiKey },
        signal: controller.signal,
        next: { revalidate: 3600 },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return null;

    const data = await res.json();
    const cards: Array<{
      setName?: string;
      prices?: { raw?: string; "psa-9"?: string; "psa-10"?: string };
    }> = data.cards ?? [];

    const withPrices = cards.filter((c) => c.prices);
    if (!withPrices.length) return null;

    const setLower = (card.set ?? "").toLowerCase();
    const match =
      withPrices.find((c) => c.setName?.toLowerCase().includes(setLower)) ??
      withPrices[0];

    const p = match.prices!;
    return {
      low: p.raw ?? null,
      mid: p["psa-9"] ?? null,
      high: p["psa-10"] ?? null,
      labels: ["Raw", "PSA 9", "PSA 10"],
      source: "CardSight",
    };
  } catch {
    return null;
  }
}

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

    const ocrText = await detectTextWithGoogleVision(imageBase64);
    const finalPrompt = ocrText
      ? `${PROMPT}\n\nHere is the raw text extracted from the image via OCR to help you identify the certification number, card name, and grade accurately:\n<ocr_text>\n${ocrText}\n</ocr_text>`
      : PROMPT;

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
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
              text: finalPrompt,
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

    // Look up image + pricing in parallel
    const [imageUrl, pricing] = await Promise.all([
      lookupCardImage(card),
      lookupPricing(card),
    ]);

    return NextResponse.json({
      card,
      matchedSymbol: matchedAsset?.symbol ?? null,
      imageUrl,
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
