/**
 * TASH — Orders Data Types
 *
 * Defines the types used for the in-memory order book.
 */

// ── Order struct ──────────────────────────────────────────────────────────

export interface Order {
  maker: string;   // Used as ID/Address
  tokenId: number;
  priceUsdc: number;   // USDC with 6 decimals, e.g. $100 = 100_000_000
  isBuy: boolean;
  quantity: number;
  nonce: number;
  expiry: number;   // unix timestamp in seconds
}

// ── Stored order (stored in order book) ─────────────────────────────────────

export interface StoredOrder {
  order: Order;
  createdAt: number;     // Date.now()
  userId: string;
  cardName: string;
  priceUsd: number;     // human-readable USD price
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert USD price to USDC units (6 decimals) */
export function usdToUsdc(usd: number): number {
  return Math.round(usd * 1_000_000);
}

/** Convert USDC units to USD */
export function usdcToUsd(usdc: number): number {
  return usdc / 1_000_000;
}

/** 24-hour expiry from now */
export function defaultExpiry(): number {
  return Math.floor(Date.now() / 1000) + 86_400;
}
