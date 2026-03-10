import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/referral/validate?code=XYZ
 * Validates if a referral code exists and is active.
 */
export async function GET(req: NextRequest) {
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");

        if (!code) {
            return NextResponse.json({ valid: false, message: "Code is required" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("referral_codes")
            .select("id, code")
            .eq("code", code)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return NextResponse.json({ valid: false, message: "Invalid referral code" });
        }

        return NextResponse.json({ valid: true, id: data.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
