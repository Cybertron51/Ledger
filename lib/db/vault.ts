import { supabase } from "@/lib/supabase";
import { type VaultHolding } from "@/lib/vault-data";

/**
 * Fetch all vault holdings for a specific user from Supabase.
 */
export async function getUserVaultHoldings(userId: string): Promise<VaultHolding[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from("vault_holdings")
        .select(`
      id,
      symbol,
      status,
      acquisition_price,
      listing_price,
      cert_number,
      image_url,
      created_at,
      cards (
        name,
        psa_grade,
        set_name,
        year
      )
    `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[db/vault] Error fetching vault holdings:", error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        name: row.cards?.name || "Unknown Card",
        symbol: row.symbol,
        grade: row.cards?.psa_grade || 9,
        set: row.cards?.set_name || "Unknown Set",
        year: row.cards?.year || new Date().getFullYear(),
        acquisitionPrice: Number(row.acquisition_price),
        status: row.status as VaultHolding["status"],
        dateDeposited: new Date(row.created_at).toISOString().split("T")[0],
        certNumber: row.cert_number || "Pending grading",
        imageUrl: row.image_url || `/cards/${row.symbol}.svg`,
        listingPrice: row.listing_price ? Number(row.listing_price) : undefined,
    }));
}

/**
 * Insert a new scanned card into the user's vault.
 */
export async function insertVaultHolding(
    userId: string,
    holding: Partial<VaultHolding> & { symbol: string; acquisitionPrice: number },
    cardId?: string
) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const { data, error } = await supabase
        .from("vault_holdings")
        .insert({
            user_id: userId,
            card_id: cardId || null,
            symbol: holding.symbol,
            status: holding.status || "pending_authentication",
            acquisition_price: holding.acquisitionPrice,
            cert_number: holding.certNumber || null,
            image_url: holding.imageUrl || null,
        })
        .select()
        .single();

    if (error) {
        console.error("[db/vault] Error inserting vault holding:", error);
        throw error;
    }

    return data;
}

/**
 * Update the status of a user's vault holding (e.g., list, withdraw, simulate received).
 */
export async function updateVaultHoldingStatus(
    id: string,
    userId: string,
    updates: { status?: VaultHolding["status"]; listingPrice?: number | null }
) {
    if (!supabase) throw new Error("Supabase client not initialized");

    const payload: any = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.listingPrice !== undefined) payload.listing_price = updates.listingPrice;

    const { data, error } = await supabase
        .from("vault_holdings")
        .update(payload)
        .eq("id", id)
        .eq("user_id", userId) // Security: ensures user can only update their own
        .select()
        .single();

    if (error) {
        console.error("[db/vault] Error updating vault holding:", error);
        throw error;
    }

    return data;
}

/**
 * Fetch a fast map of symbols to their number of active listings.
 * Used to flag cards that have no liquidity ("NOT TRADED").
 */
export async function getActiveListingCounts(): Promise<Record<string, number>> {
    if (!supabase) return {};

    const { data, error } = await supabase
        .from("vault_holdings")
        .select("symbol")
        .eq("status", "listed");

    if (error || !data) {
        console.error("[db/vault] Error fetching active listings:", error);
        return {};
    }

    const counts: Record<string, number> = {};
    for (const row of data) {
        counts[row.symbol] = (counts[row.symbol] || 0) + 1;
    }
    return counts;
}
