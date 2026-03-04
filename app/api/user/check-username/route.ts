import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";

/**
 * GET /api/user/check-username?username=xxx
 * Returns { available: boolean } for the given username.
 * Requires authentication so anonymous users can't scrape usernames.
 */
export async function GET(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin)
        return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const username = req.nextUrl.searchParams.get("username")?.trim().toLowerCase();

    if (!username || username.length < 2) {
        return NextResponse.json({ available: false, reason: "too_short" });
    }

    const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If data exists but it's the current user's own profile, it's fine
    const isSelf = data?.id === auth.userId;

    return NextResponse.json({ available: !data || isSelf });
}
