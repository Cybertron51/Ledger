import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/referrals
 * Returns list of all referral codes and their usage counts.
 */
export async function GET(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', auth.userId).single();
    if (!adminProfile?.is_admin) {
        return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    try {
        // Query referral codes and count users associated with each
        const { data: codes, error: codesError } = await supabaseAdmin
            .from("referral_codes")
            .select("*, profiles(count)");

        if (codesError) throw codesError;

        const result = codes.map((c: any) => ({
            ...c,
            usage_count: c.profiles?.[0]?.count || 0,
        }));

        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/referrals
 * Creates a new referral code.
 */
export async function POST(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', auth.userId).single();
    if (!adminProfile?.is_admin) {
        return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    try {
        const { code, description } = await req.json();
        if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from("referral_codes")
            .insert([{ code, description }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/referrals
 * Deletes a referral code.
 */
export async function DELETE(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', auth.userId).single();
    if (!adminProfile?.is_admin) {
        return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        const { error } = await supabaseAdmin
            .from("referral_codes")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
