/**
 * TASH — Order book client helpers.
 *
 * Fetches order book data through /api/market/orderbook.
 * No direct Supabase client usage.
 */

import { type OrderBook } from "@/lib/market-data";
import { apiGet } from "@/lib/api";

/**
 * Fetch the real order book for a given symbol.
 * Bids come from `orders` table (status = 'open', type = 'buy').
 * Asks come from `vault_holdings` table (status = 'listed').
 */
export async function fetchOrderBook(symbol: string): Promise<OrderBook> {
    const emptyBook: OrderBook = { asks: [], bids: [], spread: 0, spreadPct: 0 };

    try {
        return await apiGet<OrderBook>(
            `/api/market/orderbook?symbol=${encodeURIComponent(symbol)}`
        );
    } catch {
        return emptyBook;
    }
}
