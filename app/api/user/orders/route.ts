import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];

        // Verify user identity
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const authClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: authData, error: authError } = await authClient.auth.getUser(token);
        if (authError || !authData?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use admin client to query orders (RLS blocks anon key)
        const supabaseServiceUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const adminClient = createClient(supabaseServiceUrl, supabaseServiceKey);

        const { data, error } = await adminClient
            .from("orders")
            .select("id, symbol, type, price, quantity, status, created_at, holding_id")
            .eq("user_id", authData.user.id)
            .eq("status", "open")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to fetch user open orders:", error);
            return NextResponse.json({ orders: [] });
        }

        // Fetch card metadata separately
        const symbols = Array.from(new Set((data || []).map((o) => o.symbol)));
        const { data: cardsData } = symbols.length > 0
            ? await adminClient.from("cards").select("symbol, name, psa_grade").in("symbol", symbols)
            : { data: [] };

        const cardMap = new Map((cardsData || []).map((c) => [c.symbol, c]));

        const orders = (data || []).map((o) => ({
            id: o.id,
            symbol: o.symbol,
            cardName: cardMap.get(o.symbol)?.name || o.symbol,
            grade: cardMap.get(o.symbol)?.psa_grade || 10,
            type: o.type,
            price: o.price,
            quantity: o.quantity,
            createdAt: o.created_at,
            holdingId: o.holding_id
        }));

        return NextResponse.json({ orders });
    } catch (err) {
        console.error("GET /api/user/orders error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
