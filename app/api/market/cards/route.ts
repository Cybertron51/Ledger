import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/market/cards
 * Public market data — returns all cards with prices.
 * Query params: ?category=pokemon&grade=9&limit=50
 */
export async function GET(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const grade = searchParams.get("grade");
    const limit = searchParams.get("limit");

    let query = supabaseAdmin
        .from("cards")
        .select(`
      id, symbol, name, category, set_name, set_id, year,
      rarity, artist, hp, card_types, card_number,
      psa_grade, population, image_url, image_url_hi, pokemon_card_id,
      prices (price, change_24h, change_pct_24h, high_24h, low_24h, volume_24h)
    `);

    if (category) query = query.eq("category", category);
    if (grade) query = query.eq("psa_grade", parseInt(grade));
    if (limit) query = query.limit(parseInt(limit));

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the nested prices join
    const cards = (data ?? []).map((row: Record<string, unknown>) => {
        const prices = (row.prices as Record<string, unknown> | null) ?? {};
        const { prices: _drop, ...rest } = row;
        return {
            ...rest,
            price: (prices.price as number) ?? 0,
            change_24h: (prices.change_24h as number) ?? 0,
            change_pct_24h: (prices.change_pct_24h as number) ?? 0,
            high_24h: (prices.high_24h as number) ?? null,
            low_24h: (prices.low_24h as number) ?? null,
            volume_24h: (prices.volume_24h as number) ?? 0,
        };
    });

    return NextResponse.json(cards);
}
