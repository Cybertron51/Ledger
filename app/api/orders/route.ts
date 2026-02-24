import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase as globalSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    console.log("--- INCOMING ORDER REQUEST ---");
    console.log("All headers:", Object.fromEntries(req.headers.entries()));
    console.log("Auth header received:", authHeader);

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({
        error: "Missing or invalid authorization header",
        debug_headers: Object.fromEntries(req.headers.entries()),
        received_auth: authHeader
      }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const body = await req.json();
    const { userId, symbol, priceUsd, isBuy, quantity } = body;

    if (!userId || !symbol || !priceUsd || isBuy === undefined || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Create an authenticated client scoped to the user's token so RLS applies
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    if (!globalSupabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    if (isBuy) {
      // Find 'quantity' number of cheapest listed cards for this symbol
      const { data: listings, error: fetchErr } = await supabaseClient
        .from("vault_holdings")
        .select("id, user_id, listing_price")
        .eq("symbol", symbol)
        .eq("status", "listed")
        .neq("user_id", userId) // never match against the buyer's own listings
        .lte("listing_price", priceUsd) // must be less than or equal to what buyer is willing to pay
        .limit(quantity);

      if (fetchErr || !listings || listings.length < quantity) {
        return NextResponse.json({ error: "Not enough matching inventory available at this price." }, { status: 400 });
      }

      // Execute match_order RPC for each listing
      for (const listing of listings) {
        const { error: rpcErr } = await supabaseClient.rpc("match_order", {
          p_buyer_id: userId,
          p_seller_id: listing.user_id,
          p_holding_id: listing.id,
          p_price: listing.listing_price
        });

        if (rpcErr) {
          console.error("Match order error:", rpcErr);
          return NextResponse.json({ error: "Failed to settle order: " + rpcErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({
        status: "settled",
        message: "Order matched and settled successfully."
      });

    } else {
      // Selling
      // Find 'quantity' number of 'tradable' or 'in_vault' cards owned by user
      const { data: holdings, error: fetchErr } = await supabaseClient
        .from("vault_holdings")
        .select("id")
        .eq("user_id", userId)
        .eq("symbol", symbol)
        .in("status", ["tradable", "in_vault"])
        .limit(quantity);

      if (fetchErr || !holdings || holdings.length < quantity) {
        return NextResponse.json({ error: "Not enough tradable inventory in your vault." }, { status: 400 });
      }

      // Update them to listed
      const holdingIds = holdings.map(h => h.id);
      const { error: updateErr } = await supabaseClient
        .from("vault_holdings")
        .update({ status: "listed", listing_price: priceUsd })
        .in("id", holdingIds)
        .eq("user_id", userId);

      if (updateErr) {
        return NextResponse.json({ error: "Failed to list holdings." }, { status: 500 });
      }

      return NextResponse.json({
        status: "queued",
        message: "Cards listed on the market successfully."
      });
    }

  } catch (err) {
    console.error("POST /api/orders error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  // We can fetch all 'listed' cards from vault_holdings here to construct an order book summary if needed
  if (!globalSupabase) return NextResponse.json({ orders: [], count: 0 });

  const { data, error } = await globalSupabase
    .from("vault_holdings")
    .select("symbol, listing_price, user_id, created_at")
    .eq("status", "listed");

  if (error || !data) {
    return NextResponse.json({ orders: [], count: 0 });
  }

  const open = data.map((entry) => ({
    cardName: entry.symbol,
    side: "sell",
    priceUsd: entry.listing_price,
    quantity: "1",
    makerShort: entry.user_id.slice(0, 8) + "…",
    createdAt: new Date(entry.created_at).getTime(),
  }));

  return NextResponse.json({ orders: open, count: open.length });
}
