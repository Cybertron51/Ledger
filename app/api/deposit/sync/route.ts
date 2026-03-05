import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateBalance } from "@/lib/wallet";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";

/**
 * TASH — Stripe Deposit Sync API
 * 
 * This endpoint verifies a specific Checkout Session status directly with Stripe.
 * Use this as a fallback when webhooks (checkout.session.completed) fail.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await verifyAuth(req);
        if (!auth) return unauthorized();

        // We can't use regular body for GET-like behavior but we'll use POST for security + metadata
        const { sessionId } = await req.json();
        if (!sessionId) {
            return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
        }

        // 1. Retrieve the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // 2. Security Check: Ensure this session belongs to the requesting user
        if (session.metadata?.userId !== auth.userId) {
            return NextResponse.json({ error: "Unauthorized session access" }, { status: 403 });
        }

        // 3. If paid, ensure balance is updated
        if (session.payment_status === "paid" && session.payment_intent) {
            const piId = typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent as any).id;

            if (!supabaseAdmin) {
                return NextResponse.json({ error: "DB not configured" }, { status: 503 });
            }

            // ATOMIC IDEMPOTENCY: Insert with ON CONFLICT DO NOTHING.
            const amountInDollars = (session.amount_total || 0) / 100;
            const { data: inserted } = await supabaseAdmin
                .from("stripe_transactions")
                .upsert(
                    {
                        id: piId,
                        user_id: auth.userId,
                        amount: amountInDollars,
                        type: "deposit"
                    },
                    { onConflict: "id", ignoreDuplicates: true }
                )
                .select("id");

            if (!inserted || inserted.length === 0) {
                return NextResponse.json({
                    synced: true,
                    paid: true,
                    message: "Transaction already credited."
                });
            }

            // Credit the balance (only if we actually inserted a new row)
            const newBalance = await updateBalance(auth.userId, amountInDollars);

            return NextResponse.json({
                synced: true,
                paid: true,
                newBalance,
                message: "Session verified. Balance updated."
            });
        }

        return NextResponse.json({
            synced: true,
            paid: false,
            message: "Session not paid or still pending."
        });

    } catch (error: any) {
        console.error("[api/deposit/sync] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
