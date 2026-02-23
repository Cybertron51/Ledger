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
  /** On-chain ERC-1155 token ID in CardNFT */
  tokenId: number;
  grade: number;
  price: number;
  change: number;
  changePct: number;
  set: string;
  volume24h: number;
  high24h: number;
  low24h: number;
  category: "pokemon" | "sports";
}

import type { DBCard } from "./db/cards";

export function mapDBCardToAssetData(c: DBCard): AssetData {
  return {
    name: c.name,
    symbol: c.symbol,
    tokenId: 0, // Mock id, since it's no longer used for on-chain
    grade: c.psa_grade,
    price: c.price,
    change: c.change_24h,
    changePct: c.change_pct_24h,
    set: c.set_name,
    volume24h: c.volume_24h,
    high24h: c.high_24h ?? c.price,
    low24h: c.low_24h ?? c.price,
    category: c.category as "pokemon" | "sports",
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
  const { bars, intervalMs } = RANGE_CONFIGS[range];
  const rng = makeRng(symbolSeed(symbol + range));
  const now = Date.now();

  // Starting point derived from current price and session change
  const prevClose = price / (1 + changePct / 100);
  let p = prevClose * (0.82 + rng() * 0.36);

  const points: PricePoint[] = [];

  for (let i = 0; i < bars; i++) {
    const time = now - (bars - 1 - i) * intervalMs;
    const progress = i / (bars - 1);

    const volatility = 0.018;
    const noise = p * volatility * (rng() - 0.5) * 2;
    // Trend toward prevClose most of the chart, spike to current price in last ~15%
    const target = progress > 0.85 ? price : prevClose;
    const drift = (target - p) * 0.06;

    p = Math.max(p + drift + noise, price * 0.35);
    points.push({ time, price: parseFloat(p.toFixed(2)) });
  }

  // Guarantee last point matches current price exactly
  points[points.length - 1].price = price;
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
  const rng = makeRng(symbolSeed(symbol + "spark"));
  const prevClose = price / (1 + changePct / 100);
  let p = prevClose;
  const now = Date.now();

  const points: PricePoint[] = [];

  for (let i = 0; i < 20; i++) {
    const time = now - (19 - i) * 60 * 60 * 1000;
    const progress = i / 19;
    const noise = p * 0.012 * (rng() - 0.5) * 2;
    const drift = (price - p) * 0.12 * progress;
    p = Math.max(p + drift + noise, price * 0.5);
    points.push({ time, price: parseFloat(p.toFixed(2)) });
  }

  points[points.length - 1].price = price;
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
  const volatility = 0.003;
  const delta = asset.price * volatility * (Math.random() - 0.5) * 2;
  const newPrice = Math.max(asset.price + delta, asset.price * 0.5);
  const openPrice = asset.price / (1 + asset.changePct / 100);
  const newChange = newPrice - openPrice;
  const newChangePct = (newChange / openPrice) * 100;

  return {
    ...asset,
    price: parseFloat(newPrice.toFixed(2)),
    change: parseFloat(newChange.toFixed(2)),
    changePct: parseFloat(newChangePct.toFixed(3)),
    high24h: Math.max(asset.high24h, newPrice),
    low24h: Math.min(asset.low24h, newPrice),
  };
}


