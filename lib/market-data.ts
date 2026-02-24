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
  category: "pokemon" | "sports";
  hasLiquidity?: boolean; // True if there are active listings for this card
}

import type { DBCard } from "./db/cards";

export function mapDBCardToAssetData(c: DBCard): AssetData {
  return {
    name: c.name,
    symbol: c.symbol,
    grade: c.psa_grade,
    price: c.price,
    change: c.change_24h,
    changePct: c.change_pct_24h,
    set: c.set_name,
    volume24h: c.volume_24h,
    high24h: c.high_24h ?? c.price,
    low24h: c.low_24h ?? c.price,
    category: c.category as "pokemon" | "sports",
    hasLiquidity: false, // Will be populated by the frontend
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

export type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y";

// ─────────────────────────────────────────────────────────
// Seeded RNG — deterministic charts per symbol
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
// History generator — OHLCV-inspired price series
// ─────────────────────────────────────────────────────────

const RANGE_CONFIGS: Record<TimeRange, { bars: number; intervalMs: number }> = {
  "1D": { bars: 48, intervalMs: 30 * 60 * 1000 },           // 30-min bars
  "1W": { bars: 84, intervalMs: 2 * 60 * 60 * 1000 },       // 2-hr bars
  "1M": { bars: 60, intervalMs: 12 * 60 * 60 * 1000 },      // 12-hr bars
  "3M": { bars: 90, intervalMs: 24 * 60 * 60 * 1000 },      // daily
  "1Y": { bars: 52, intervalMs: 7 * 24 * 60 * 60 * 1000 },  // weekly
};

export function generateHistory(
  price: number,
  changePct: number,
  range: TimeRange,
  symbol: string
): PricePoint[] {
  // Temporary behavior: just generate a flat line at the current price
  // until we wire up the real `price_history` database table.
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
  // Temporary behavior: just generate a flat line at the current price
  // to remove hallucinatory noise.
  const now = Date.now();
  const points: PricePoint[] = [];

  for (let i = 0; i < 20; i++) {
    const time = now - (19 - i) * 60 * 60 * 1000;
    points.push({ time, price });
  }

  return points;
}

// ─────────────────────────────────────────────────────────
// Order book generator
// ─────────────────────────────────────────────────────────

export function generateOrderBook(midPrice: number, symbol: string, userAsks: OrderBookRow[] = []): OrderBook {
  const rng = makeRng(symbolSeed(symbol + "book"));
  const spreadBps = 40 + rng() * 40; // 40–80 bps
  const half = (midPrice * spreadBps) / 20000;
  const askBase = midPrice + half;
  const bidBase = midPrice - half;

  let asks: OrderBookRow[] = [];
  const bids: OrderBookRow[] = [];
  let askTotal = 0;
  let bidTotal = 0;

  const levels = 12;
  for (let i = 0; i < levels; i++) {
    const askPrice = askBase * (1 + i * 0.002);
    const askSize = Math.ceil(rng() * 3);
    askTotal += askSize;
    asks.push({ price: askPrice, size: askSize, total: askTotal, depth: 0 });

    const bidPrice = bidBase * (1 - i * 0.002);
    const bidSize = Math.ceil(rng() * 3);
    bidTotal += bidSize;
    bids.push({ price: bidPrice, size: bidSize, total: bidTotal, depth: 0 });
  }

  // Inject real user asks and recalculate totals
  if (userAsks.length > 0) {
    asks = [...asks, ...userAsks].sort((a, b) => a.price - b.price);
    askTotal = 0;
    asks.forEach((a) => {
      askTotal += a.size;
      a.total = askTotal;
    });
  }

  const maxTotal = Math.max(
    asks[asks.length - 1]?.total || 0,
    bids[bids.length - 1]?.total || 0
  );

  if (maxTotal > 0) {
    asks.forEach((a) => { a.depth = a.total / maxTotal; });
    bids.forEach((b) => { b.depth = b.total / maxTotal; });
  }

  return {
    asks: [...asks].reverse(), // highest ask at top
    bids,
    spread: (asks[0]?.price ?? askBase) - (bids[0]?.price ?? bidBase),
    spreadPct: (((asks[0]?.price ?? askBase) - (bids[0]?.price ?? bidBase)) / midPrice) * 100,
  };
}

// ─────────────────────────────────────────────────────────
// Live price tick — small random walk
// ─────────────────────────────────────────────────────────

export function tickPrice(asset: AssetData): AssetData {
  // Disable random ticks to keep the market stable and non-hallucinatory
  return asset;
}


