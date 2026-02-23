/**
 * TASH — Vault Holdings Data
 *
 * Static mock data for the authenticated user's vault.
 * `currentValue` is NOT stored here — it is derived live
 * from the ASSETS price array in lib/market-data.ts.
 */

export interface VaultHolding {
  id: string;
  name: string;
  symbol: string;       // matches AssetData.symbol in lib/market-data.ts
  grade: number;        // 8, 9, or 10
  set: string;
  year: number;
  acquisitionPrice: number;
  status: "pending_authentication" | "shipped" | "received" | "authenticating" | "in_vault" | "tradable" | "in_transit" | "withdrawn" | "listed";
  dateDeposited: string; // ISO date string
  certNumber: string;    // mock PSA cert number
  imageUrl: string;
  listingPrice?: number;
}

/** Reads scanned cards pre-registered via /scan from localStorage. Safe to call on server (returns []). */
export function getScannedHoldings(): VaultHolding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("tash-scanned-cards");
    return raw ? (JSON.parse(raw) as VaultHolding[]) : [];
  } catch {
    return [];
  }
}

