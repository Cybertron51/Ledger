/**
 * LEDGER — Mock Ticker Data
 *
 * Simulates real-time PSA 10 card price feeds.
 * Replace with WebSocket / API integration in production.
 *
 * Ticker symbol convention: PSA SKU (e.g. "PSA10-CHRIZ-1999")
 */

export interface TickerItem {
  /** Display name of the card */
  name: string;
  /** PSA SKU used as the trading symbol */
  symbol: string;
  /** PSA grade (always 10 for top-tier listing) */
  grade: number;
  /** Current ask/last trade price in USD */
  price: number;
  /** Absolute change from previous close */
  change: number;
  /** Percentage change from previous close */
  changePct: number;
  /** Card set / year for context */
  set: string;
}

export const TOP_PSA10_ASSETS: TickerItem[] = [
  {
    name: "Charizard Holo",
    symbol: "CHZ10-BASE-1999",
    grade: 10,
    price: 14_250.00,
    change: +850.00,
    changePct: +6.34,
    set: "Base Set",
  },
  {
    name: "Pikachu Illustrator",
    symbol: "PIKA10-ILLUS-1998",
    grade: 10,
    price: 248_000.00,
    change: -12_500.00,
    changePct: -4.80,
    set: "Promo",
  },
  {
    name: "Blastoise Holo",
    symbol: "BLS10-BASE-1999",
    grade: 10,
    price: 3_800.00,
    change: +210.00,
    changePct: +5.85,
    set: "Base Set",
  },
  {
    name: "LeBron James RC",
    symbol: "LBJ10-TOP-2003",
    grade: 10,
    price: 5_650.00,
    change: +320.00,
    changePct: +6.01,
    set: "Topps Chrome 2003",
  },
  {
    name: "Michael Jordan RC",
    symbol: "MJ10-STAR-1986",
    grade: 10,
    price: 738_000.00,
    change: +21_000.00,
    changePct: +2.93,
    set: "Fleer 1986",
  },
  {
    name: "Mew Promo",
    symbol: "MEW10-CORO-1996",
    grade: 10,
    price: 18_400.00,
    change: -900.00,
    changePct: -4.67,
    set: "CoroCoro Promo",
  },
  {
    name: "Patrick Mahomes RC",
    symbol: "PMH10-OPTIC-2017",
    grade: 10,
    price: 2_100.00,
    change: +155.00,
    changePct: +7.97,
    set: "Donruss Optic 2017",
  },
  {
    name: "Shohei Ohtani RC",
    symbol: "SHO10-TOPPS-2018",
    grade: 10,
    price: 1_450.00,
    change: -88.00,
    changePct: -5.72,
    set: "Topps Update 2018",
  },
  {
    name: "Rayquaza Gold Star",
    symbol: "RAY10-DS-2005",
    grade: 10,
    price: 42_500.00,
    change: +3_100.00,
    changePct: +7.87,
    set: "Delta Species",
  },
  {
    name: "Tom Brady RC",
    symbol: "TB12-BOWM-2000",
    grade: 10,
    price: 780_000.00,
    change: +34_000.00,
    changePct: +4.56,
    set: "Bowman Chrome 2000",
  },
  {
    name: "Umbreon Gold Star",
    symbol: "UMB10-POP-2005",
    grade: 10,
    price: 12_800.00,
    change: -640.00,
    changePct: -4.76,
    set: "POP Series 5",
  },
  {
    name: "Wembanyama RC",
    symbol: "WEM10-PRIZM-2023",
    grade: 10,
    price: 8_900.00,
    change: +1_200.00,
    changePct: +15.58,
    set: "Prizm 2023",
  },
];
