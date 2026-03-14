import { NextResponse } from "next/server";
import { fetchJustTCGPrice } from "@/lib/justtcg";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const name = searchParams.get("name");
        const set = searchParams.get("set") || "";
        const category = searchParams.get("category") || "pokemon";
        const cardNumber = searchParams.get("cardNumber");

        if (!name) {
            return NextResponse.json(
                { error: "Card name is required" },
                { status: 400 }
            );
        }

        const price = await fetchJustTCGPrice(name, set, category, cardNumber);

        return NextResponse.json({ price });
    } catch (error) {
        console.error("JustTCG API Route Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch price" },
            { status: 500 }
        );
    }
}
