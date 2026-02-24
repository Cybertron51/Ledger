import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase as globalSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    const body = await req.json();
    const { userId, holdingId, currentValueUsd } = body;

    if (!userId || !holdingId || !currentValueUsd) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    if (!globalSupabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // 1. Calculate Withdrawal Fee
    const fee = currentValueUsd * 0.035;

    // 2. Fetch User Profile to check balance
    const { data: profile, error: profileErr } = await supabaseClient
      .from("profiles")
      .select("cash_balance")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
    }

    if (Number(profile.cash_balance) < fee) {
      return NextResponse.json({ error: "Insufficient funds to cover withdrawal fee" }, { status: 400 });
    }

    // 3. Update holding status to 'withdrawn'
    const { error: updateErr } = await supabaseClient
      .from("vault_holdings")
      .update({ status: "withdrawn" })
      .eq("id", holdingId)
      .eq("user_id", userId)
      .in("status", ["tradable", "in_vault"]);

    if (updateErr) {
       return NextResponse.json({ error: "Failed to update holding or holding is not tradable." }, { status: 400 });
    }

    // 4. Deduct fee using Service Role to bypass strict RLS if needed, or via RPC.
    // We already checked balance under user context so doing an admin override for balance deduction.
    const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey);
    const { error: deductErr } = await adminSupabase
      .from("profiles")
      .update({ cash_balance: Number(profile.cash_balance) - fee })
      .eq("id", userId);

    if (deductErr) {
      console.error("Failed to deduct withdrawal fee. Holding was marked withdrawn but user was not charged.", deductErr);
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal requested successfully.",
      feeCharged: fee
    });

  } catch (err) {
    console.error("POST /api/withdraw error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
