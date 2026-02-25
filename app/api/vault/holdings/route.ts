import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";

/**
 * GET /api/vault/holdings — Returns the authenticated user's vault holdings.
 * POST /api/vault/holdings — Insert a new vault holding for the authenticated user.
 */
export async function GET(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data, error } = await supabaseAdmin
        .from("vault_holdings")
        .select(`
      id,
      symbol,
      status,
      acquisition_price,
      listing_price,
      cert_number,
      image_url,
      raw_image_url,
      created_at,
      cards (
        name,
        psa_grade,
        set_name,
        year
      )
    `)
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to frontend-friendly format
    const holdings = (data || []).map((row: Record<string, unknown>) => {
        const cards = row.cards as Record<string, unknown> | null;
        return {
            id: row.id,
            name: (cards?.name as string) || "Unknown Card",
            symbol: row.symbol,
            grade: (cards?.psa_grade as number) || 9,
            set: (cards?.set_name as string) || "Unknown Set",
            year: (cards?.year as number) || new Date().getFullYear(),
            acquisitionPrice: Number(row.acquisition_price),
            status: row.status,
            dateDeposited: new Date(row.created_at as string).toISOString().split("T")[0],
            certNumber: (row.cert_number as string) || "Pending grading",
            imageUrl: (row.image_url as string) || `/cards/${row.symbol}.svg`,
            rawImageUrl: (row.raw_image_url as string) || undefined,
            listingPrice: row.listing_price ? Number(row.listing_price) : undefined,
        };
    });

    return NextResponse.json(holdings);
}

export async function POST(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorized();
    if (!supabaseAdmin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const body = await req.json();
    const { symbol, acquisitionPrice, status, certNumber, imageUrl, rawImageUrl, cardId } = body;

    if (!symbol || acquisitionPrice === undefined) {
        return NextResponse.json({ error: "symbol and acquisitionPrice are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("vault_holdings")
        .insert({
            user_id: auth.userId,
            card_id: cardId || null,
            symbol,
            status: status || "pending_authentication",
            acquisition_price: acquisitionPrice,
            cert_number: certNumber || null,
            image_url: imageUrl || null,
            raw_image_url: rawImageUrl || null,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
