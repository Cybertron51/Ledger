import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";

/**
 * PATCH /api/admin/approve
 * Admin-only: approve a shipped item to "tradable".
 * Body: { holdingId }
 */
export async function PATCH(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // TODO: Add proper admin role check. For now, any authenticated user can approve.
    // In production, check auth.userId against an admin list or use Supabase custom claims.

    const body = await req.json();
    const { holdingId } = body;

    if (!holdingId) {
        return NextResponse.json({ error: "holdingId is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("vault_holdings")
        .update({ status: "tradable" })
        .eq("id", holdingId)
        .in("status", ["shipped", "pending_authentication"])  // Can approve shipped or pending items
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

/**
 * GET /api/admin/approve
 * Returns all items with status = 'shipped' (pending approval).
 */
export async function GET(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data, error } = await supabaseAdmin
        .from("vault_holdings")
        .select(`
      id,
      symbol,
      acquisition_price,
      status,
      image_url,
      profiles(name, email)
    `)
        .in("status", ["shipped", "pending_authentication"])
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
}
