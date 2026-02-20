/**
 * LEDGER — Vault Holdings Data
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
  status: "in_vault" | "in_transit" | "listed";
  dateDeposited: string; // ISO date string
  certNumber: string;    // mock PSA cert number
  imageUrl: string;
  listingPrice?: number;
}

/** Reads scanned cards pre-registered via /scan from localStorage. Safe to call on server (returns []). */
export function getScannedHoldings(): VaultHolding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ledger-scanned-cards");
    return raw ? (JSON.parse(raw) as VaultHolding[]) : [];
  } catch {
    return [];
  }
}

/** Merges static vault holdings with any locally-scanned in-transit cards. */
export function getAllHoldings(): VaultHolding[] {
  return [...VAULT_HOLDINGS, ...getScannedHoldings()];
}

export const VAULT_HOLDINGS: VaultHolding[] = [
  {
    id: "v1",
    name: "Charizard Holo",
    symbol: "CHZ10-BASE-1999",
    grade: 10,
    set: "Base Set 1999",
    year: 1999,
    acquisitionPrice: 12_400.00,
    status: "in_vault",
    dateDeposited: "2024-03-15",
    certNumber: "PSA 47821930",
    imageUrl: "/cards/CHZ10-BASE-1999.svg",
  },
  {
    id: "v2",
    name: "Blastoise Holo",
    symbol: "BLS10-BASE-1999",
    grade: 10,
    set: "Base Set 1999",
    year: 1999,
    acquisitionPrice: 3_300.00,
    status: "listed",
    dateDeposited: "2024-05-02",
    certNumber: "PSA 52104773",
    imageUrl: "/cards/BLS10-BASE-1999.svg",
  },
  {
    id: "v3",
    name: "LeBron James RC",
    symbol: "LBJ10-TOP-2003",
    grade: 10,
    set: "Topps Chrome 2003",
    year: 2003,
    acquisitionPrice: 4_900.00,
    status: "in_vault",
    dateDeposited: "2024-01-28",
    certNumber: "PSA 38847201",
    imageUrl: "/cards/LBJ10-TOP-2003.svg",
  },
  {
    id: "v4",
    name: "Patrick Mahomes RC",
    symbol: "PMH10-OPTIC-2017",
    grade: 10,
    set: "Donruss Optic 2017",
    year: 2017,
    acquisitionPrice: 1_820.00,
    status: "in_transit",
    dateDeposited: "2024-07-11",
    certNumber: "PSA 61903854",
    imageUrl: "/cards/PMH10-OPTIC-2017.svg",
  },
  {
    id: "v5",
    name: "Rayquaza Gold Star",
    symbol: "RAY10-DS-2005",
    grade: 9,
    set: "Delta Species 2005",
    year: 2005,
    acquisitionPrice: 37_200.00,
    status: "in_vault",
    dateDeposited: "2023-11-19",
    certNumber: "PSA 44512087",
    imageUrl: "/cards/RAY10-DS-2005.svg",
  },
  {
    id: "v6",
    name: "Umbreon Gold Star",
    symbol: "UMB10-POP-2005",
    grade: 9,
    set: "POP Series 5",
    year: 2005,
    acquisitionPrice: 11_100.00,
    status: "in_vault",
    dateDeposited: "2024-02-07",
    certNumber: "PSA 49230561",
    imageUrl: "/cards/UMB10-POP-2005.svg",
  },
];
