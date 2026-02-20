/**
 * LEDGER — EIP-712 Order Utilities
 *
 * Defines the typed-data domain and types that match LedgerExchange.sol.
 * Used by both the API (server-side signing) and the frontend.
 */

import { CHAIN_ID, LEDGER_EXCHANGE_ADDRESS } from "./contracts";

// ── EIP-712 domain ───────────────────────────────────────────────────────────

export const ORDER_DOMAIN = {
  name:              "LedgerExchange",
  version:           "1",
  chainId:           CHAIN_ID,
  verifyingContract: LEDGER_EXCHANGE_ADDRESS,
} as const;

// ── Typed data types ─────────────────────────────────────────────────────────

export const ORDER_TYPES = {
  Order: [
    { name: "maker",      type: "address" },
    { name: "tokenId",   type: "uint256"  },
    { name: "priceUsdc", type: "uint256"  },
    { name: "isBuy",     type: "bool"     },
    { name: "quantity",  type: "uint256"  },
    { name: "nonce",     type: "uint256"  },
    { name: "expiry",    type: "uint256"  },
  ],
} as const;

// ── Order struct (mirrors Solidity) ──────────────────────────────────────────

export interface Order {
  maker:      `0x${string}`;
  tokenId:    bigint;
  priceUsdc:  bigint;   // USDC with 6 decimals, e.g. $100 = 100_000_000n
  isBuy:      boolean;
  quantity:   bigint;
  nonce:      bigint;
  expiry:     bigint;   // unix timestamp in seconds
}

// ── Signed order (stored in order book) ─────────────────────────────────────

export interface SignedOrder {
  order:     Order;
  signature: `0x${string}`;
  createdAt: number;     // Date.now()
  userId:    string;
  cardName:  string;
  priceUsd:  number;     // human-readable USD price
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert USD price to USDC units (6 decimals) */
export function usdToUsdc(usd: number): bigint {
  return BigInt(Math.round(usd * 1_000_000));
}

/** Convert USDC units to USD */
export function usdcToUsd(usdc: bigint): number {
  return Number(usdc) / 1_000_000;
}

/** 24-hour expiry from now */
export function defaultExpiry(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 86_400);
}
