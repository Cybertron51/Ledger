import { apiGet } from "@/lib/api";
import type { TimeRange } from "@/lib/chart-series";

export interface PortfolioHistoryPoint {
  recorded_at: string;
  price: number;
}

/**
 * Authenticated: portfolio total value series from per-symbol trade history.
 */
export async function getPortfolioTradeHistory(range: TimeRange): Promise<PortfolioHistoryPoint[]> {
  try {
    return await apiGet<PortfolioHistoryPoint[]>(
      `/api/portfolio/history?range=${encodeURIComponent(range)}`
    );
  } catch {
    return [];
  }
}
