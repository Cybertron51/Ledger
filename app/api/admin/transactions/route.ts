import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;

/**
 * GET /api/admin/transactions
 * Admin-only: returns settled trades with buyer/seller info.
 *
 * Query params:
 *   ?offset=N        — skip N records (default 0)
 *   ?limit=N         — records to return (default 100)
 *   ?all=true        — return everything, no limit (CSV export only)
 */
export async function GET(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', auth.userId).single();
    if (!adminProfile?.is_admin) {
        return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const exportAll = searchParams.get("all") === "true";
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));

    // Get the true total and the requested page in parallel
    const [countResult, tradesResult] = await Promise.all([
        supabaseAdmin
            .from("trades")
            .select("id", { count: "exact", head: true }),
        (() => {
            const q = supabaseAdmin!
                .from("trades")
                .select("id, symbol, price, executed_at, buyer_id, seller_id")
                .order("executed_at", { ascending: false });
            return exportAll ? q : q.range(offset, offset + limit - 1);
        })(),
    ]);

    const total = countResult.count ?? 0;

    // Batch-fetch profiles for all unique user IDs on this page
    const userIds = new Set<string>();
    for (const t of tradesResult.data ?? []) {
        if (t.buyer_id) userIds.add(t.buyer_id);
        if (t.seller_id) userIds.add(t.seller_id);
    }

    const profileMap = new Map<string, { name: string | null; email: string | null }>();
    if (userIds.size > 0) {
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, name, email")
            .in("id", [...userIds]);
        for (const p of profiles ?? []) {
            profileMap.set(p.id, { name: p.name, email: p.email });
        }
    }

    const displayName = (id: string | null) => {
        if (!id) return null;
        const p = profileMap.get(id);
        return p?.name || p?.email || id;
    };
    const displayEmail = (id: string | null) => {
        if (!id) return null;
        return profileMap.get(id)?.email || null;
    };

    const data = (tradesResult.data ?? []).map((t) => ({
        id: t.id,
        symbol: t.symbol,
        buyer: displayName(t.buyer_id),
        buyer_email: displayEmail(t.buyer_id),
        seller: displayName(t.seller_id),
        seller_email: displayEmail(t.seller_id),
        price: Number(t.price),
        timestamp: t.executed_at,
    }));

    return NextResponse.json({
        data,
        total,
        offset,
        hasMore: !exportAll && offset + data.length < total,
    });
}
