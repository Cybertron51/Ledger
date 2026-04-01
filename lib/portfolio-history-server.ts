/**
 * Server-only: portfolio total value over time from summed **per-symbol** trade-driven series.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applySevenDaySimulatedMovement,
  buildTradeBucketedSeries,
  clampPriceToAnchorBand,
  RANGE_CONFIGS,
  type TimeRange,
} from "@/lib/chart-series";
import { anchorPriceForSymbol } from "@/lib/market-history-server";
import type { HistoryRow } from "@/lib/market-history-server";

export async function buildPortfolioTradeHistory(
  admin: SupabaseClient,
  holdingSymbols: string[],
  range: TimeRange
): Promise<HistoryRow[]> {
  if (holdingSymbols.length === 0) return [];

  const { bars, intervalMs } = RANGE_CONFIGS[range];
  const nowMs = Date.now();
  const sinceMs = nowMs - bars * intervalMs - 120_000;
  const sinceIso = new Date(sinceMs).toISOString();

  const uniqueSyms = [...new Set(holdingSymbols)];

  const { data: tradesWindow } = await admin
    .from("trades")
    .select("symbol, price, executed_at")
    .in("symbol", uniqueSyms)
    .gte("executed_at", sinceIso)
    .order("executed_at", { ascending: true })
    .limit(50000);

  const anchorBySymbol = new Map<string, number>();
  await Promise.all(
    uniqueSyms.map(async (sym) => {
      anchorBySymbol.set(sym, await anchorPriceForSymbol(admin, sym));
    })
  );

  const priorTradeBySymbol = new Map<string, number | null>();
  await Promise.all(
    uniqueSyms.map(async (sym) => {
      const { data: pt } = await admin
        .from("trades")
        .select("price")
        .eq("symbol", sym)
        .lt("executed_at", sinceIso)
        .order("executed_at", { ascending: false })
        .limit(1);
      priorTradeBySymbol.set(
        sym,
        pt?.[0] != null ? Number((pt[0] as { price: unknown }).price) : null
      );
    })
  );

  const tradesBySymbol = new Map<string, { t: number; price: number }[]>();
  for (const r of tradesWindow ?? []) {
    const sym = r.symbol as string;
    const arr = tradesBySymbol.get(sym) ?? [];
    const anch = anchorBySymbol.get(sym) ?? 1;
    arr.push({
      t: new Date(String(r.executed_at)).getTime(),
      price: clampPriceToAnchorBand(Number(r.price), anch),
    });
    tradesBySymbol.set(sym, arr);
  }

  const seriesBySymbol = new Map<string, ReturnType<typeof buildTradeBucketedSeries>>();
  for (const sym of uniqueSyms) {
    const anchor = anchorBySymbol.get(sym) ?? 1;
    const start = clampPriceToAnchorBand(priorTradeBySymbol.get(sym) ?? anchor, anchor);
    const tradePts = tradesBySymbol.get(sym) ?? [];
    let s = buildTradeBucketedSeries(tradePts, anchor, start, bars, intervalMs, nowMs);
    s = applySevenDaySimulatedMovement(s, anchor, sym, nowMs, intervalMs, range);
    seriesBySymbol.set(sym, s);
  }

  const out: HistoryRow[] = [];
  for (let i = 0; i < bars; i++) {
    const t = nowMs - (bars - 1 - i) * intervalMs;
    let total = 0;
    for (const sym of holdingSymbols) {
      const s = seriesBySymbol.get(sym);
      if (s?.[i]) total += s[i]!.price;
    }
    out.push({ recorded_at: new Date(t).toISOString(), price: total });
  }

  return out;
}
