import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

/**
 * TASH — Stripe Checkout API
 * 
 * Creates a hosted checkout session for deposits.
 */

export async function POST(req: NextRequest) {
    try {
        const { amountCents, userId, email } = await req.json();

        if (!amountCents || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const origin = req.headers.get("origin") || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Deposit to Tash Wallet",
                            description: "Funds will be available for trading instantly.",
                        },
                        unit_amount: amountCents,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            customer_email: email,
            metadata: {
                userId: userId,
            },
            payment_intent_data: {
                metadata: {
                    userId: userId,
                },
            },
            success_url: `${origin}/deposit?success=true&amount=${amountCents / 100}`,
            cancel_url: `${origin}/deposit?canceled=true`,
        });

        return NextResponse.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
        console.error("[api/deposit/checkout] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
