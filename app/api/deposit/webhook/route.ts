import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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
    // TODO: wire to Supabase — update user's cashBalance in DB
    console.log("[deposit/webhook] payment_intent.succeeded", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  }

  return NextResponse.json({ received: true });
}
