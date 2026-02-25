import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/market/cards/[symbol]
 * Returns a single card by its trading symbol.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { symbol } = await params;

    const { data, error } = await supabaseAdmin
        .from("cards")
        .select(`
      id, symbol, name, category, set_name, set_id, year,
      rarity, artist, hp, card_types, card_number,
      psa_grade, population, image_url, image_url_hi, pokemon_card_id,
      prices (price, change_24h, change_pct_24h, high_24h, low_24h, volume_24h)
    `)
        .eq("symbol", symbol)
        .single();

    if (error) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pricesRaw = data.prices as any;
    const prices = (Array.isArray(pricesRaw) ? pricesRaw[0] : pricesRaw) ?? {};
    const { prices: _drop, ...rest } = data;

    return NextResponse.json({
        ...rest,
        price: (prices.price as number) ?? 0,
        change_24h: (prices.change_24h as number) ?? 0,
        change_pct_24h: (prices.change_pct_24h as number) ?? 0,
        high_24h: (prices.high_24h as number) ?? null,
        low_24h: (prices.low_24h as number) ?? null,
        volume_24h: (prices.volume_24h as number) ?? 0,
    });
}
