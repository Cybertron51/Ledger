/**
 * TASH — Vault holdings client helpers.
 *
 * All operations go through /api/vault/* routes.
 * No direct Supabase client usage.
 */

import { type VaultHolding } from "@/lib/vault-data";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

/**
 * Fetch all vault holdings for the current authenticated user.
 */
export async function getUserVaultHoldings(): Promise<VaultHolding[]> {
    try {
        return await apiGet<VaultHolding[]>("/api/vault/holdings");
    } catch (err) {
        console.error("[db/vault] Error fetching vault holdings:", err);
        return [];
    }
}

/**
 * Insert a new scanned card into the user's vault.
 */
export async function insertVaultHolding(
    holding: Partial<VaultHolding> & { symbol: string; acquisitionPrice: number },
    cardId?: string
) {
    return apiPost("/api/vault/holdings", {
        symbol: holding.symbol,
        acquisitionPrice: holding.acquisitionPrice,
        status: holding.status || "pending_authentication",
        certNumber: holding.certNumber || null,
        imageUrl: holding.imageUrl || null,
        rawImageUrl: holding.rawImageUrl || null,
        cardId: cardId || null,
    });
}

/**
 * Update the status of a user's vault holding (e.g., list, withdraw, ship).
 */
export async function updateVaultHoldingStatus(
    holdingId: string,
    updates: { status?: VaultHolding["status"]; listingPrice?: number | null }
) {
    return apiPatch("/api/vault/update", {
        holdingId,
        status: updates.status,
        listingPrice: updates.listingPrice,
    });
}

/**
 * Fetch a map of symbols to their number of active listings.
 * Used to flag cards that have no liquidity ("NOT TRADED").
 */
export async function getActiveListingCounts(): Promise<Record<string, number>> {
    try {
        return await apiGet<Record<string, number>>("/api/vault/listings");
    } catch (err) {
        console.error("[db/vault] Error fetching active listings:", err);
        return {};
    }
}
