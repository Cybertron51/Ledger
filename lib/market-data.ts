/**
 * LEDGER — Extended Market Data
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
  "1D": { bars: 48,  intervalMs: 30 * 60 * 1000 },           // 30-min bars
  "1W": { bars: 84,  intervalMs: 2 * 60 * 60 * 1000 },       // 2-hr bars
  "1M": { bars: 60,  intervalMs: 12 * 60 * 60 * 1000 },      // 12-hr bars
  "3M": { bars: 90,  intervalMs: 24 * 60 * 60 * 1000 },      // daily
  "1Y": { bars: 52,  intervalMs: 7 * 24 * 60 * 60 * 1000 },  // weekly
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

export function generateOrderBook(midPrice: number, symbol: string): OrderBook {
  const rng = makeRng(symbolSeed(symbol + "book"));
  const spreadBps = 40 + rng() * 40; // 40–80 bps
  const half = (midPrice * spreadBps) / 20000;
  const askBase = midPrice + half;
  const bidBase = midPrice - half;

  const asks: OrderBookRow[] = [];
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

  const maxTotal = Math.max(
    asks[asks.length - 1].total,
    bids[bids.length - 1].total
  );

  asks.forEach((a) => { a.depth = a.total / maxTotal; });
  bids.forEach((b) => { b.depth = b.total / maxTotal; });

  return {
    asks: [...asks].reverse(), // highest ask at top
    bids,
    spread: askBase - bidBase,
    spreadPct: ((askBase - bidBase) / midPrice) * 100,
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

// ─────────────────────────────────────────────────────────
// Asset data
// ─────────────────────────────────────────────────────────

export const ASSETS: AssetData[] = [
  {
    name: "Charizard Holo",
    symbol: "CHZ10-BASE-1999",
    tokenId: 1,
    grade: 10,
    price: 14_250.00,
    change: +850.00,
    changePct: +6.34,
    set: "Base Set 1999",
    volume24h: 3,
    high24h: 14_500.00,
    low24h: 13_200.00,
    category: "pokemon",
  },
  {
    name: "Pikachu Illustrator",
    symbol: "PIKA10-ILLUS-1998",
    tokenId: 2,
    grade: 10,
    price: 248_000.00,
    change: -12_500.00,
    changePct: -4.80,
    set: "Promo 1998",
    volume24h: 1,
    high24h: 260_000.00,
    low24h: 245_000.00,
    category: "pokemon",
  },
  {
    name: "Blastoise Holo",
    symbol: "BLS10-BASE-1999",
    tokenId: 3,
    grade: 10,
    price: 3_800.00,
    change: +210.00,
    changePct: +5.85,
    set: "Base Set 1999",
    volume24h: 5,
    high24h: 3_900.00,
    low24h: 3_550.00,
    category: "pokemon",
  },
  {
    name: "LeBron James RC",
    symbol: "LBJ10-TOP-2003",
    tokenId: 4,
    grade: 10,
    price: 5_650.00,
    change: +320.00,
    changePct: +6.01,
    set: "Topps Chrome 2003",
    volume24h: 4,
    high24h: 5_800.00,
    low24h: 5_200.00,
    category: "sports",
  },
  {
    name: "Michael Jordan RC",
    symbol: "MJ10-STAR-1986",
    tokenId: 5,
    grade: 10,
    price: 738_000.00,
    change: +21_000.00,
    changePct: +2.93,
    set: "Fleer 1986",
    volume24h: 1,
    high24h: 750_000.00,
    low24h: 710_000.00,
    category: "sports",
  },
  {
    name: "Mew Promo",
    symbol: "MEW10-CORO-1996",
    tokenId: 6,
    grade: 10,
    price: 18_400.00,
    change: -900.00,
    changePct: -4.67,
    set: "CoroCoro Promo 1996",
    volume24h: 2,
    high24h: 19_500.00,
    low24h: 17_800.00,
    category: "pokemon",
  },
  {
    name: "Patrick Mahomes RC",
    symbol: "PMH10-OPTIC-2017",
    tokenId: 7,
    grade: 10,
    price: 2_100.00,
    change: +155.00,
    changePct: +7.97,
    set: "Donruss Optic 2017",
    volume24h: 8,
    high24h: 2_200.00,
    low24h: 1_900.00,
    category: "sports",
  },
  {
    name: "Shohei Ohtani RC",
    symbol: "SHO10-TOPPS-2018",
    tokenId: 8,
    grade: 10,
    price: 1_450.00,
    change: -88.00,
    changePct: -5.72,
    set: "Topps Update 2018",
    volume24h: 6,
    high24h: 1_580.00,
    low24h: 1_400.00,
    category: "sports",
  },
  {
    name: "Rayquaza Gold Star",
    symbol: "RAY10-DS-2005",
    tokenId: 9,
    grade: 10,
    price: 42_500.00,
    change: +3_100.00,
    changePct: +7.87,
    set: "Delta Species 2005",
    volume24h: 2,
    high24h: 43_000.00,
    low24h: 39_000.00,
    category: "pokemon",
  },
  {
    name: "Tom Brady RC",
    symbol: "TB12-BOWM-2000",
    tokenId: 10,
    grade: 10,
    price: 780_000.00,
    change: +34_000.00,
    changePct: +4.56,
    set: "Bowman Chrome 2000",
    volume24h: 1,
    high24h: 790_000.00,
    low24h: 740_000.00,
    category: "sports",
  },
  {
    name: "Umbreon Gold Star",
    symbol: "UMB10-POP-2005",
    tokenId: 11,
    grade: 10,
    price: 12_800.00,
    change: -640.00,
    changePct: -4.76,
    set: "POP Series 5",
    volume24h: 3,
    high24h: 13_500.00,
    low24h: 12_500.00,
    category: "pokemon",
  },
  {
    name: "Wembanyama RC",
    symbol: "WEM10-PRIZM-2023",
    tokenId: 12,
    grade: 10,
    price: 8_900.00,
    change: +1_200.00,
    changePct: +15.58,
    set: "Prizm 2023",
    volume24h: 12,
    high24h: 9_200.00,
    low24h: 7_500.00,
    category: "sports",
  },
];
