import { supabase } from "@/lib/supabase";
import { type OrderBook, type OrderBookRow } from "@/lib/market-data";

/**
 * Fetch the real order book for a given symbol.
 * Bids come from `orders` table (status = 'open', type = 'buy').
 * Asks come from `vault_holdings` table (status = 'listed').
 */
export async function fetchOrderBook(symbol: string, currentUserId?: string): Promise<OrderBook> {
    const emptyBook: OrderBook = { asks: [], bids: [], spread: 0, spreadPct: 0 };
    if (!supabase) return emptyBook;

    // Fetch bids (buy orders)
    const [{ data: bidsData }, { data: asksData }] = await Promise.all([
        supabase
            .from("orders")
            .select("price, quantity")
            .eq("symbol", symbol)
            .eq("type", "buy")
            .eq("status", "open"),
        supabase
            .from("vault_holdings")
            .select("listing_price")
            .eq("symbol", symbol)
            .eq("status", "listed")
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
            askMap.set(p, (askMap.get(p) || 0) + 1); // Each vault holding is 1 quantity
        }
    }

    // Convert to OrderBookRow arrays
    let bids: OrderBookRow[] = Array.from(bidMap.entries()).map(([price, size]) => ({
        price,
        size,
        total: 0,
        depth: 0,
    }));
    // Bids sorted descending (highest bid first)
    bids.sort((a, b) => b.price - a.price);

    let asks: OrderBookRow[] = Array.from(askMap.entries()).map(([price, size]) => ({
        price,
        size,
        total: 0,
        depth: 0,
    }));
    // Asks sorted ascending for compute, then we will reverse for display
    asks.sort((a, b) => a.price - b.price);

    // Compute totals and depth
    let bidTotal = 0;
    for (const b of bids) {
        bidTotal += b.size;
        b.total = bidTotal;
    }
    let askTotal = 0;
    for (const a of asks) {
        askTotal += a.size;
        a.total = askTotal;
    }

    const maxTotal = Math.max(bidTotal, askTotal);
    if (maxTotal > 0) {
        for (const b of bids) b.depth = b.total / maxTotal;
        for (const a of asks) a.depth = a.total / maxTotal;
    }

    // Asks are displayed highest price at the top, so reverse
    asks.reverse();

    // Calculate spread (lowest ask - highest bid)
    let spread = 0;
    let spreadPct = 0;
    if (asks.length > 0 && bids.length > 0) {
        const lowestAsk = asks[asks.length - 1].price;
        const highestBid = bids[0].price;
        spread = Math.max(0, lowestAsk - highestBid);
        if (lowestAsk > 0) spreadPct = spread / lowestAsk;
    } else if (asks.length > 0) {
        // If no bids, spread is empty, but let's keep it 0 or similar to market-data logic
        spread = 0;
    }

    return { asks, bids, spread, spreadPct };
}
