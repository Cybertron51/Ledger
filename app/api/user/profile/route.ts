import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";

/**
 * GET /api/user/profile — Returns authenticated user's profile.
 * PATCH /api/user/profile — Update profile fields (onboarding, etc.)
 */
export async function GET(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email, name, username, favorite_tcgs, primary_goal, cash_balance, created_at")
        .eq("id", auth.userId)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const body = await req.json();
    const allowedFields = ["name", "username", "favorite_tcgs", "primary_goal"];
    const payload: Record<string, unknown> = {};

    for (const field of allowedFields) {
        if (body[field] !== undefined) payload[field] = body[field];
    }

    if (Object.keys(payload).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(payload)
        .eq("id", auth.userId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
