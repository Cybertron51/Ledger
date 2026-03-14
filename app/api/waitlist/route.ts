import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 });
        }

        if (!supabaseAdmin) {
            throw new Error("Supabase admin client not initialized");
        }

        const { error } = await supabaseAdmin
            .from("waitlist")
            .insert({ email });

        // 23505 is the unique_violation error code in Postgres
        if (error && error.code !== "23505") {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to join waitlist" },
            { status: 500 }
        );
    }
}
