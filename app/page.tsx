/**
 * LEDGER — Market Home Page
 *
 * Landing view: featured PSA 10 assets in a grid,
 * with price changes and quick-action links.
 * (Full asset detail view comes in the next sprint.)
 */

import { TrendingUp, TrendingDown, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import { TOP_PSA10_ASSETS } from "@/lib/ticker-data";
import { colors } from "@/lib/theme";
import { formatCurrency, cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────
// Sub-component: asset card
// ─────────────────────────────────────────────────────────

function AssetCard({
  name,
  symbol,
  grade,
  price,
  change,
  changePct,
  set,
}: (typeof TOP_PSA10_ASSETS)[number]) {
  const isUp = change >= 0;

  return (
    <Link
      href={`/asset/${encodeURIComponent(symbol)}`}
      className="group flex flex-col justify-between rounded-[12px] border p-4 transition-all duration-200 hover:border-[#3E3E3E]"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textDecoration: "none",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="truncate text-[13px] font-semibold leading-tight"
            style={{ color: colors.textPrimary }}
          >
            {name}
          </p>
          <p
            className="mt-[3px] text-[11px] font-medium tracking-[0.05em] uppercase"
            style={{ color: colors.textMuted }}
          >
            {symbol}
          </p>
        </div>

        {/* PSA badge */}
        <div
          className="flex shrink-0 items-center gap-[4px] rounded-[6px] px-2 py-[3px]"
          style={{
            backgroundColor:
              grade === 10 ? colors.greenMuted : colors.goldMuted,
            border: `1px solid ${grade === 10 ? colors.green + "33" : colors.gold + "33"}`,
          }}
        >
          <span
            className="text-[10px] font-bold tracking-wide"
            style={{ color: grade === 10 ? colors.green : colors.gold }}
          >
            PSA {grade}
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="mt-4">
        <p
          className="tabular-nums text-[22px] font-bold leading-none tracking-tight"
          style={{ color: colors.textPrimary }}
        >
          {formatCurrency(price)}
        </p>

        {/* Change row */}
        <div className="mt-[6px] flex items-center gap-[6px]">
          <span
            className="flex items-center gap-[3px] tabular-nums text-[12px] font-semibold"
            style={{ color: isUp ? colors.green : colors.red }}
          >
            {isUp ? (
              <TrendingUp size={12} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={12} strokeWidth={2.5} />
            )}
            {isUp ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
          <span className="text-[12px]" style={{ color: colors.textMuted }}>
            {isUp ? "+" : ""}
            {formatCurrency(change)}
          </span>
        </div>
      </div>

      {/* Footer: set name + arrow */}
      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: colors.borderSubtle }}>
        <span className="text-[11px]" style={{ color: colors.textMuted }}>
          {set}
        </span>
        <ChevronRight
          size={14}
          strokeWidth={2}
          style={{ color: colors.textMuted }}
          className="transition-transform duration-150 group-hover:translate-x-[2px]"
        />
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function MarketPage() {
  const gainers = [...TOP_PSA10_ASSETS]
    .filter((a) => a.change > 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 3);

  const losers = [...TOP_PSA10_ASSETS]
    .filter((a) => a.change < 0)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 3);

  return (
    <div
      className="mx-auto max-w-[1440px] px-6 py-8"
      style={{ color: colors.textPrimary }}
    >
      {/* ── Hero ──────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} strokeWidth={2.5} style={{ color: colors.green }} />
          <span
            className="text-[11px] font-semibold tracking-[0.1em] uppercase"
            style={{ color: colors.green }}
          >
            Live Market
          </span>
        </div>
        <h1
          className="text-[32px] font-bold leading-tight tracking-tight"
          style={{ letterSpacing: "-0.03em" }}
        >
          Trading Card Exchange
        </h1>
        <p
          className="mt-2 text-[15px]"
          style={{ color: colors.textSecondary }}
        >
          Institutional-grade liquidity for PSA 8+ certified collectibles.
        </p>
      </section>

      {/* ── Top Movers ────────────────────────────── */}
      <section className="mb-10">
        <h2
          className="mb-4 text-[13px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: colors.textMuted }}
        >
          Top Gainers
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gainers.map((asset) => (
            <AssetCard key={asset.symbol} {...asset} />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2
          className="mb-4 text-[13px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: colors.textMuted }}
        >
          Top Losers
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {losers.map((asset) => (
            <AssetCard key={asset.symbol} {...asset} />
          ))}
        </div>
      </section>

      {/* ── Full market table ─────────────────────── */}
      <section>
        <h2
          className="mb-4 text-[13px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: colors.textMuted }}
        >
          All Assets
        </h2>

        <div
          className="overflow-hidden rounded-[12px] border"
          style={{ borderColor: colors.border, backgroundColor: colors.surface }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b px-4 py-3"
            style={{ borderColor: colors.borderSubtle }}
          >
            {["Asset", "Price", "Change", "Set"].map((h) => (
              <span
                key={h}
                className="text-[11px] font-semibold tracking-[0.08em] uppercase"
                style={{ color: colors.textMuted }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Table rows */}
          {TOP_PSA10_ASSETS.map((asset, i) => {
            const isUp = asset.change >= 0;
            const isLast = i === TOP_PSA10_ASSETS.length - 1;

            return (
              <Link
                key={asset.symbol}
                href={`/asset/${encodeURIComponent(asset.symbol)}`}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3",
                  "transition-colors duration-100 hover:bg-[#2A2A2A]",
                  !isLast && "border-b"
                )}
                style={{
                  borderColor: colors.borderSubtle,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="min-w-0">
                  <p
                    className="truncate text-[13px] font-medium"
                    style={{ color: colors.textPrimary }}
                  >
                    {asset.name}
                  </p>
                  <p
                    className="text-[11px] uppercase tracking-[0.04em]"
                    style={{ color: colors.textMuted }}
                  >
                    PSA {asset.grade}
                  </p>
                </div>

                <span
                  className="tabular-nums text-[13px] font-semibold"
                  style={{ color: colors.textPrimary }}
                >
                  {formatCurrency(asset.price)}
                </span>

                <span
                  className="tabular-nums text-[13px] font-semibold"
                  style={{ color: isUp ? colors.green : colors.red }}
                >
                  {isUp ? "+" : ""}
                  {asset.changePct.toFixed(2)}%
                </span>

                <span
                  className="text-[12px]"
                  style={{ color: colors.textMuted }}
                >
                  {asset.set}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
