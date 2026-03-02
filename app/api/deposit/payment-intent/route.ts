import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

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
      { stripeAccount: process.env.STRIPE_ACCOUNT_ID }
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
