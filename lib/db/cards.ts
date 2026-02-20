/**
 * LEDGER — Database query helpers for card catalog.
 *
 * These functions hit Supabase and return typed results.
 * They are safe to call from server components, API routes,
 * or client components (via an API route wrapper).
 *
 * If Supabase is not configured, they return null so callers
 * can fall back to the static ASSETS array in lib/market-data.ts.
 */

import { supabase } from "@/lib/supabase";

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
// Queries
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all cards with their current prices.
 * Returns null if Supabase is not configured.
 */
export async function getMarketCards(options?: {
  category?: "pokemon" | "sports";
  grade?: 8 | 9 | 10;
  limit?: number;
}): Promise<DBCard[] | null> {
  if (!supabase) return null;

  let query = supabase
    .from("cards")
    .select(`
      id, symbol, name, category, set_name, set_id, year,
      rarity, artist, hp, card_types, card_number,
      psa_grade, population, image_url, image_url_hi, pokemon_card_id,
      prices (price, change_24h, change_pct_24h, high_24h, low_24h, volume_24h)
    `);

  if (options?.category) query = query.eq("category", options.category);
  if (options?.grade)    query = query.eq("psa_grade", options.grade);
  if (options?.limit)    query = query.limit(options.limit);

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error("[db/cards] getMarketCards error:", error.message);
    return null;
  }

  return (data ?? []).map(flattenPrices);
}

/**
 * Fetch a single card by its trading symbol.
 * Returns null if not found or Supabase not configured.
 */
export async function getCardBySymbol(symbol: string): Promise<DBCard | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("cards")
    .select(`
      id, symbol, name, category, set_name, set_id, year,
      rarity, artist, hp, card_types, card_number,
      psa_grade, population, image_url, image_url_hi, pokemon_card_id,
      prices (price, change_24h, change_pct_24h, high_24h, low_24h, volume_24h)
    `)
    .eq("symbol", symbol)
    .single();

  if (error) return null;
  return flattenPrices(data);
}

/**
 * Fetch price history for a card over a given number of days.
 */
export async function getPriceHistory(
  cardId: string,
  days = 30
): Promise<PricePoint[]> {
  if (!supabase) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("price_history")
    .select("recorded_at, price")
    .eq("card_id", cardId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

/**
 * Search cards by name (case-insensitive prefix/substring match).
 */
export async function searchCards(query: string, limit = 20): Promise<DBCard[]> {
  if (!supabase || !query.trim()) return [];

  const { data, error } = await supabase
    .from("cards")
    .select(`
      id, symbol, name, category, set_name, set_id, year,
      rarity, psa_grade, population, image_url, image_url_hi,
      prices (price, change_24h, change_pct_24h)
    `)
    .ilike("name", `%${query}%`)
    .limit(limit);

  if (error) return [];
  return (data ?? []).map(flattenPrices);
}

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

function flattenPrices(row: Record<string, unknown>): DBCard {
  const prices = (row.prices as Record<string, unknown> | null) ?? {};
  const { prices: _drop, ...rest } = row;
  return {
    ...rest,
    price:           (prices.price           as number) ?? 0,
    change_24h:      (prices.change_24h      as number) ?? 0,
    change_pct_24h:  (prices.change_pct_24h  as number) ?? 0,
    high_24h:        (prices.high_24h        as number) ?? null,
    low_24h:         (prices.low_24h         as number) ?? null,
    volume_24h:      (prices.volume_24h      as number) ?? 0,
  } as DBCard;
}
