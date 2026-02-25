/**
 * TASH — Transaction history client helpers.
 *
 * All operations go through /api/user/transactions.
 * No direct Supabase client usage.
 */

import { apiGet } from "@/lib/api";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type TxType = "buy" | "sell" | "deposit" | "withdrawal";
export type TxStatus = "settled" | "pending" | "cancelled";

export interface Transaction {
    id: string;
    type: TxType;
    status: TxStatus;
    cardName?: string;
    grade?: number;
    amount: number;
    quantity?: number;
    priceEach?: number;
    timestamp: Date;
    txHash?: string;
}

// ─────────────────────────────────────────────────────────
// Queries — all go through /api/user/transactions
// ─────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's transaction history.
 */
export async function getUserTransactions(): Promise<Transaction[]> {
    try {
        const raw = await apiGet<Array<Record<string, unknown>>>("/api/user/transactions");
        return raw.map((t) => ({
            ...t,
            timestamp: new Date(t.timestamp as string),
        })) as Transaction[];
    } catch {
        return [];
    }
}

/**
 * Get summary counts for the authenticated user's transactions.
 */
export async function getUserTransactionSummary(): Promise<{
    totalTrades: number;
    settled: number;
    pending: number;
}> {
    try {
        return await apiGet("/api/user/transactions?summary=true");
    } catch {
        return { totalTrades: 0, settled: 0, pending: 0 };
    }
}
