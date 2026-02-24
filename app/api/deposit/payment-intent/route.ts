import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Safely initialize stripe so the Next.js build doesn't crash
// if STRIPE_SECRET_KEY is missing from the environment.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2026-01-28.clover",
});

// Avoid crashes during Next build if missing
const stripeAccount = process.env.STRIPE_ACCOUNT_ID ?? "acct_placeholder";

const MIN_CENTS = 100;   // $1.00
const MAX_CENTS = 1_000_000; // $10,000.00

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountCents, userId } = body;

    if (
      typeof amountCents !== "number" ||
      !Number.isInteger(amountCents) ||
      amountCents < MIN_CENTS ||
      amountCents > MAX_CENTS
    ) {
      return NextResponse.json(
        { error: "Amount must be between $10 and $10,000" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "usd",
        payment_method_types: ["card"],
        metadata: {
          userId: userId || "",
        }
      },
      { stripeAccount }
    );

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("[deposit/payment-intent]", err);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
