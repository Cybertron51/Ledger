import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";

/**
 * GET /api/user/transactions
 * Returns the authenticated user's transaction history.
 * Query params: ?summary=true to get just counts.
 */
export async function GET(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { searchParams } = new URL(req.url);
    const summaryOnly = searchParams.get("summary") === "true";

    if (summaryOnly) {
        const [tradesCount, pendingCount] = await Promise.all([
            supabaseAdmin
                .from("trades")
                .select("id", { count: "exact", head: true })
                .or(`buyer_id.eq.${auth.userId},seller_id.eq.${auth.userId}`),
            supabaseAdmin
                .from("orders")
                .select("id", { count: "exact", head: true })
                .eq("user_id", auth.userId)
                .eq("status", "open"),
        ]);

        const settled = tradesCount.count ?? 0;
        const pending = pendingCount.count ?? 0;

        return NextResponse.json({
            totalTrades: settled + pending,
            settled,
            pending,
        });
    }

    // Full transaction history
    const [tradesResult, ordersResult] = await Promise.all([
        supabaseAdmin
            .from("trades")
            .select(`id, symbol, buyer_id, seller_id, price, executed_at`)
            .or(`buyer_id.eq.${auth.userId},seller_id.eq.${auth.userId}`)
            .order("executed_at", { ascending: false })
            .limit(100),
        supabaseAdmin
            .from("orders")
            .select(`id, symbol, type, price, quantity, status, created_at`)
            .eq("user_id", auth.userId)
            .in("status", ["open", "cancelled"])
            .order("created_at", { ascending: false })
            .limit(100),
    ]);

    const transactions = [];

    for (const t of tradesResult.data ?? []) {
        const isBuyer = t.buyer_id === auth.userId;
        transactions.push({
            id: t.id,
            type: isBuyer ? "buy" : "sell",
            status: "settled",
            cardName: t.symbol,
            amount: Number(t.price),
            quantity: 1,
            priceEach: Number(t.price),
            timestamp: t.executed_at,
        });
    }

    for (const o of ordersResult.data ?? []) {
        transactions.push({
            id: o.id,
            type: o.type,
            status: o.status === "open" ? "pending" : "cancelled",
            cardName: o.symbol,
            amount: Number(o.price) * o.quantity,
            quantity: o.quantity,
            priceEach: Number(o.price),
            timestamp: o.created_at,
        });
    }

    transactions.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(transactions);
}
