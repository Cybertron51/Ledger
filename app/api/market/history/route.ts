import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildCardMarketHistory, buildSymbolTradeHistory } from "@/lib/market-history-server";
import type { TimeRange } from "@/lib/chart-series";

const RANGES: TimeRange[] = ["1D", "1W", "1M", "3M", "1Y"];

function parseRange(param: string | null, daysFallback: number): TimeRange {
  if (param && (RANGES as string[]).includes(param)) {
    return param as TimeRange;
  }
  if (daysFallback <= 1) return "1D";
  if (daysFallback <= 7) return "1W";
  if (daysFallback <= 30) return "1M";
  if (daysFallback <= 90) return "3M";
  return "1Y";
}

/**
 * GET /api/market/history?cardId=xxx&range=1M
 * GET /api/market/history?symbol=XXX&range=1M
 * Optional legacy: &days=30 (mapped to nearest range).
 *
 * Series is built from **trades** plus **`price_history`** for that card (when `cardId` is used), merged into buckets. Catalog `prices` anchors the last bucket.
 */
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get("cardId");
  const symbol = searchParams.get("symbol")?.trim();
  const rangeParam = searchParams.get("range");
  const days = parseInt(searchParams.get("days") || "30", 10);
  const range = parseRange(rangeParam, Number.isFinite(days) ? days : 30);

  if (!cardId && !symbol) {
    return NextResponse.json({ error: "cardId or symbol is required" }, { status: 400 });
  }

  const rows = cardId
    ? await buildCardMarketHistory(supabaseAdmin, cardId, range)
    : await buildSymbolTradeHistory(supabaseAdmin, symbol!, range);

  return NextResponse.json(rows);
}
