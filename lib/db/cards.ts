/**
 * TASH — Database query helpers for card catalog.
 *
 * These functions call our server-side API routes
 * which use the service role key to access Supabase.
 * No direct Supabase client usage from the frontend.
 */

import { apiGet } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface DBCard {
  id: string;
  symbol: string;
  name: string;
  category: "pokemon" | "sports" | "mtg" | "other";
  set_name: string;
  set_id: string | null;
  year: number | null;
  rarity: string | null;
  artist: string | null;
  hp: number | null;
  card_types: string[] | null;
  card_number: string | null;
  psa_grade: 8 | 9 | 10;
  population: number;
  image_url: string | null;
  image_url_hi: string | null;
  pokemon_card_id: string | null;
  // Joined from prices table
  price: number;
  change_24h: number;
  change_pct_24h: number;
  high_24h: number | null;
  low_24h: number | null;
  volume_24h: number;
}

export interface PricePoint {
  recorded_at: string;
  price: number;
}

// ─────────────────────────────────────────────────────────────
// Queries — all go through /api/market/* routes
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all cards with their current prices.
 */
export async function getMarketCards(options?: {
  category?: "pokemon" | "sports";
  grade?: 8 | 9 | 10;
  limit?: number;
}): Promise<DBCard[] | null> {
  try {
    const params = new URLSearchParams();
    if (options?.category) params.set("category", options.category);
    if (options?.grade) params.set("grade", String(options.grade));
    if (options?.limit) params.set("limit", String(options.limit));

    const qs = params.toString();
    return await apiGet<DBCard[]>(`/api/market/cards${qs ? `?${qs}` : ""}`);
  } catch {
    console.error("[db/cards] getMarketCards error");
    return null;
  }
}

/**
 * Fetch a single card by its trading symbol.
 */
export async function getCardBySymbol(symbol: string): Promise<DBCard | null> {
  try {
    return await apiGet<DBCard>(`/api/market/cards/${encodeURIComponent(symbol)}`);
  } catch {
    return null;
  }
}

/**
 * Fetch price history for a card over a given number of days.
 */
export async function getPriceHistory(
  cardId: string,
  days = 30
): Promise<PricePoint[]> {
  try {
    return await apiGet<PricePoint[]>(
      `/api/market/history?cardId=${encodeURIComponent(cardId)}&days=${days}`
    );
  } catch {
    return [];
  }
}

/**
 * Search cards by name (case-insensitive prefix/substring match).
 */
export async function searchCards(query: string, limit = 20): Promise<DBCard[]> {
  if (!query.trim()) return [];
  try {
    return await apiGet<DBCard[]>(
      `/api/market/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  } catch {
    return [];
  }
}
