import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/market/orderbook?symbol=CHAR-PSA10
 * Returns the order book (bids + asks) for a symbol.
 */
export async function GET(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
        return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    }

    // Fetch bids (buy orders) and asks (listed vault holdings) in parallel
    const [{ data: bidsData }, { data: asksData }] = await Promise.all([
        supabaseAdmin
            .from("orders")
            .select("price, quantity")
            .eq("symbol", symbol)
            .eq("type", "buy")
            .eq("status", "open"),
        supabaseAdmin
            .from("vault_holdings")
            .select("listing_price")
            .eq("symbol", symbol)
            .eq("status", "listed"),
    ]);

    // Aggregate bids by price
    const bidMap = new Map<number, number>();
    for (const row of bidsData || []) {
        const p = Number(row.price);
        bidMap.set(p, (bidMap.get(p) || 0) + row.quantity);
    }

    // Aggregate asks by price
    const askMap = new Map<number, number>();
    for (const row of asksData || []) {
        if (row.listing_price) {
            const p = Number(row.listing_price);
            askMap.set(p, (askMap.get(p) || 0) + 1);
        }
    }

    // Convert to arrays
    let bids = Array.from(bidMap.entries()).map(([price, size]) => ({
        price, size, total: 0, depth: 0,
    }));
    bids.sort((a, b) => b.price - a.price);

    let asks = Array.from(askMap.entries()).map(([price, size]) => ({
        price, size, total: 0, depth: 0,
    }));
    asks.sort((a, b) => a.price - b.price);

    // Compute totals and depth
    let bidTotal = 0;
    for (const b of bids) { bidTotal += b.size; b.total = bidTotal; }
    let askTotal = 0;
    for (const a of asks) { askTotal += a.size; a.total = askTotal; }

    const maxTotal = Math.max(bidTotal, askTotal);
    if (maxTotal > 0) {
        for (const b of bids) b.depth = b.total / maxTotal;
        for (const a of asks) a.depth = a.total / maxTotal;
    }

    asks.reverse();

    // Spread
    let spread = 0;
    let spreadPct = 0;
    if (asks.length > 0 && bids.length > 0) {
        const lowestAsk = asks[asks.length - 1].price;
        const highestBid = bids[0].price;
        spread = Math.max(0, lowestAsk - highestBid);
        if (lowestAsk > 0) spreadPct = spread / lowestAsk;
    }

    return NextResponse.json({ asks, bids, spread, spreadPct });
}
