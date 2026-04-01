/**
 * TASH — Extended Market Data
 *
 * Generates mock historical prices, order books, and live simulation data.
 * Replace generators with real WebSocket / REST API in production.
 */

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface AssetData {
  id: string;
  name: string;
  symbol: string;
  grade: number;
  price: number;
  change: number;
  changePct: number;
  set: string;
  volume24h: number;
  high24h: number;
  low24h: number;
  category: "pokemon" | "sports" | "mtg" | "other";
  hasLiquidity?: boolean; // True if there are active listings for this card
  population: number;
  imageUrl?: string;
}

import type { DBCard } from "./db/cards";
import { RANGE_CONFIGS, SPARKLINE, type TimeRange } from "./chart-series";

export type { TimeRange } from "./chart-series";

/** Keep 7D change in sync when only `price` updates (e.g. realtime). Baseline = price at last full compute. */
export function recomputeAssetChangeForNewPrice(
  asset: Pick<AssetData, "price" | "change">,
  newPrice: number
): { change: number; changePct: number } {
  const baseline = asset.price - asset.change;
  const change = newPrice - baseline;
  const changePct = baseline > 0 ? (change / baseline) * 100 : 0;
  return { change, changePct };
}

export function mapDBCardToAssetData(c: DBCard): AssetData {
  const has7d = "change_7d" in c && "change_pct_7d" in c;
  return {
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    grade: c.psa_grade,
    price: c.price,
    change: has7d ? c.change_7d! : c.change_24h,
    changePct: has7d ? c.change_pct_7d! : c.change_pct_24h,
    set: c.set_name,
    volume24h: c.volume_24h,
    high24h: c.high_24h ?? c.price,
    low24h: c.low_24h ?? c.price,
    category: c.category,
    hasLiquidity: false, // Will be populated by the frontend
    population: c.population,
    imageUrl: c.image_url_hi || c.image_url || undefined,
  };
}

export interface PricePoint {
  time: number;
  price: number;
}

export interface OrderBookRow {
  price: number;
  size: number;    // number of copies
  total: number;   // cumulative total
  depth: number;   // 0–1 for depth bar width
}

export interface OrderBook {
  asks: OrderBookRow[]; // sorted descending (highest at top for display)
  bids: OrderBookRow[]; // sorted descending (highest first)
  spread: number;
  spreadPct: number;
}

// ─────────────────────────────────────────────────────────
// Seeded RNG — deterministic charts per symbol (portfolio fallbacks)
// ─────────────────────────────────────────────────────────

function symbolSeed(str: string): number {
  return str
    .split("")
    .reduce((acc, c) => (Math.imul(acc, 31) + c.charCodeAt(0)) | 0, 0x811c9dc5);
}

function makeRng(seed: number) {
  let s = (Math.abs(seed) | 1) >>> 0;
  return () => {
    s = ((Math.imul(s, 1664525) + 1013904223) | 0) >>> 0;
    return s / 0x100000000;
  };
}

// ─────────────────────────────────────────────────────────
// History generator — synthetic fallback when no API series
// ─────────────────────────────────────────────────────────

export function generateHistory(
  price: number,
  changePct: number,
  range: TimeRange,
  symbol: string
): PricePoint[] {
  // Fallback: flat line when trade-driven APIs are unavailable (e.g. offline).
  const now = Date.now();
  const { bars, intervalMs } = RANGE_CONFIGS[range];
  const points: PricePoint[] = [];

  for (let i = 0; i < bars; i++) {
    const time = now - (bars - 1 - i) * intervalMs;
    points.push({ time, price });
  }

  return points;
}

// ─────────────────────────────────────────────────────────
// Sparkline generator — 20 hourly points
// ─────────────────────────────────────────────────────────

export function generateSparkline(
  price: number,
  changePct: number,
  symbol: string
): PricePoint[] {
  const now = Date.now();
  const points: PricePoint[] = [];
  const { bars, intervalMs } = SPARKLINE;

  for (let i = 0; i < bars; i++) {
    const time = now - (bars - 1 - i) * intervalMs;
    points.push({ time, price });
  }

  return points;
}

// ─────────────────────────────────────────────────────────
// Order book generator
// ─────────────────────────────────────────────────────────



// ─────────────────────────────────────────────────────────
// Live price tick — small random walk
// ─────────────────────────────────────────────────────────

export function tickPrice(asset: AssetData): AssetData {
  return asset;
}


