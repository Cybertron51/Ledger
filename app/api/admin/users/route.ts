import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Returns list of all users, their emails, and their last login.
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
        // We keep `last_sign_in_at` from Supabase Auth,
        // but we display "Account Created" from `public.profiles.created_at`
        // so our `scripts/usertimestamps.csv` edits show up in the UI.
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const authUsers = data.users;
        const authUserIds = authUsers.map((u) => u.id);

        const { data: profileRows, error: profilesError } = await supabaseAdmin
            .from("profiles")
            .select("id, created_at, is_admin")
            .in("id", authUserIds);

        if (profilesError) {
            // If profiles lookup fails, fall back to auth timestamps rather than breaking admin.
            console.warn("Failed to load profiles.created_at for admin users:", profilesError.message);
        }

        const profileById = new Map<string, any>();
        for (const p of profileRows ?? []) {
            if (p.id) profileById.set(p.id, p);
        }

        const users = authUsers.map((user) => {
            const profile = profileById.get(user.id);
            const created_at = profile?.created_at ?? user.created_at;
            const last_login = user.last_sign_in_at || created_at;

            return {
                id: user.id,
                email: user.email,
                created_at,
                last_login,
                is_admin: !!profile?.is_admin,
            };
        });

        // Sort by last login descending
        users.sort((a, b) => new Date(b.last_login).getTime() - new Date(a.last_login).getTime());

        return NextResponse.json(users);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', auth.userId).single();
    if (!adminProfile?.is_admin) {
        return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId, is_admin } = body;
        if (!userId || is_admin === undefined) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const { error } = await supabaseAdmin
            .from("profiles")
            .update({ is_admin })
            .eq("id", userId);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
