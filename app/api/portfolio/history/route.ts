import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, verifyAuth, unauthorized } from "@/lib/supabase-admin";
import { buildPortfolioTradeHistory } from "@/lib/portfolio-history-server";
import type { TimeRange } from "@/lib/chart-series";

const RANGES: TimeRange[] = ["1D", "1W", "1M", "3M", "1Y"];

function parseRange(param: string | null): TimeRange {
  if (param && (RANGES as string[]).includes(param)) {
    return param as TimeRange;
  }
  return "1M";
}

/**
 * GET /api/portfolio/history?range=1M
 * Authenticated: total vault value over time from trade tape per symbol (one series per symbol, summed per holding row).
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return unauthorized();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const range = parseRange(searchParams.get("range"));

  const { data: rows, error } = await supabaseAdmin
    .from("vault_holdings")
    .select("symbol")
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const symbols = (rows ?? []).map((r) => r.symbol as string);
  const history = await buildPortfolioTradeHistory(supabaseAdmin, symbols, range);

  return NextResponse.json(history);
}
