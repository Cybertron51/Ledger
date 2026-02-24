import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Safely initialize stripe so the Next.js build doesn't crash
// if STRIPE_SECRET_KEY is missing from the environment.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2026-01-28.clover",
});

// Avoid crashes during Next build if missing
const stripeAccount = process.env.STRIPE_ACCOUNT_ID ?? "acct_placeholder";

// Required by Next.js to read raw body for Stripe signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[deposit/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    console.log("[deposit/webhook] payment_intent.succeeded", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });

    const userId = paymentIntent.metadata?.userId;
    if (userId) {
      // The amount is in cents, but cash_balance is stored as decimal (dollars)
      // Actually some people store in cents, but our schema DEFAULT is 25000.00
      // So we assume cash_balance is in dollars.
      const amountDollars = paymentIntent.amount / 100;

      const { data: profile, error: readErr } = await supabaseAdmin
        .from("profiles")
        .select("cash_balance")
        .eq("id", userId)
        .single();

      if (readErr) {
        console.error(`[deposit/webhook] Failed to read profile for user ${userId}:`, readErr);
      } else if (profile) {
        const newBalance = Number(profile.cash_balance) + amountDollars;
        const { error: updateErr } = await supabaseAdmin
          .from("profiles")
          .update({ cash_balance: newBalance })
          .eq("id", userId);

        if (updateErr) {
          console.error(`[deposit/webhook] Failed to update balance for user ${userId}:`, updateErr);
        } else {
          console.log(`[deposit/webhook] Updated balance for user ${userId} to ${newBalance}`);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
