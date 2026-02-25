import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/market/history?cardId=xxx&days=30
 * Returns price history for a card over a given number of days.
 */
export async function GET(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get("cardId");
    const days = parseInt(searchParams.get("days") || "30");

    if (!cardId) {
        return NextResponse.json({ error: "cardId is required" }, { status: 400 });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from("price_history")
        .select("recorded_at, price")
        .eq("card_id", cardId)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
}
