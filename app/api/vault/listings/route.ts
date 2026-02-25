import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/vault/listings
 * Returns a map of symbol → active listing count.
 * Public — no auth required (used to determine market liquidity).
 */
export async function GET() {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "DB not configured" }, { status: 503 });
    }

    const { data, error } = await supabaseAdmin
        .from("vault_holdings")
        .select("symbol")
        .eq("status", "listed");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    for (const row of data || []) {
        counts[row.symbol] = (counts[row.symbol] || 0) + 1;
    }

    return NextResponse.json(counts);
}
