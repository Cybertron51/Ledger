"use client";

/**
 * LEDGER — Market Home
 *
 * Two views toggled by the user:
 *   Simple   — portfolio-first casual browse (default)
 *   Advanced — full 3-column trading terminal
 *
 * The toggle always lives in the same physical position:
 *   top of the right sidebar (above "Order Book") in advanced mode,
 *   and the equivalent top-right corner in simple mode.
 */

import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, Zap, LayoutGrid, BarChart2 } from "lucide-react";
import { SignInModal } from "@/components/auth/SignInModal";
import { SimpleView } from "@/components/market/SimpleView";
import {
  ASSETS,
  generateHistory,
  generateSparkline,
  generateOrderBook,
  tickPrice,
  type AssetData,
  type TimeRange,
} from "@/lib/market-data";
import { SparklineChart } from "@/components/market/SparklineChart";
import { PriceChart } from "@/components/market/PriceChart";
import { OrderBook } from "@/components/market/OrderBook";
import { TradePanel } from "@/components/market/TradePanel";
import { colors, layout } from "@/lib/theme";
import { formatCurrency, cn } from "@/lib/utils";

type ViewMode = "simple" | "advanced";

// ─────────────────────────────────────────────────────────
// View toggle — same component used in both layouts
// ─────────────────────────────────────────────────────────

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div
      className="flex items-center rounded-[8px] p-[3px]"
      style={{ background: colors.surfaceOverlay }}
    >
      {(["simple", "advanced"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className="flex items-center gap-[5px] rounded-[6px] px-3 py-[5px] text-[11px] font-semibold transition-all duration-150"
          style={{
            background: mode === m ? colors.surface : "transparent",
            color: mode === m ? colors.textPrimary : colors.textMuted,
            boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
          }}
        >
          {m === "simple"
            ? <><LayoutGrid size={11} strokeWidth={2} /> Simple</>
            : <><BarChart2 size={11} strokeWidth={2} /> Advanced</>
          }
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function MarketPage() {
  const [assets, setAssets] = useState<AssetData[]>(ASSETS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(ASSETS[0].symbol);
  const [range, setRange] = useState<TimeRange>("1D");
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down">>({});
  const [showSignIn, setShowSignIn] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("simple");

  // Persist view preference
  useEffect(() => {
    const stored = localStorage.getItem("ledger-view-mode") as ViewMode | null;
    if (stored === "simple" || stored === "advanced") setViewMode(stored);
  }, []);

  function handleViewChange(m: ViewMode) {
    setViewMode(m);
    localStorage.setItem("ledger-view-mode", m);
  }

  const selected = assets.find((a) => a.symbol === selectedSymbol) ?? assets[0];
  const isUp = selected.change >= 0;

  // ── Live price ticks ───────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets((prev) => {
        const next = prev.map((asset) =>
          Math.random() > 0.45 ? asset : tickPrice(asset)
        );
        const flashes: Record<string, "up" | "down"> = {};
        next.forEach((asset, i) => {
          if (asset.price !== prev[i].price)
            flashes[asset.symbol] = asset.price > prev[i].price ? "up" : "down";
        });
        if (Object.keys(flashes).length > 0) {
          setFlashMap(flashes);
          setTimeout(() => setFlashMap({}), 500);
        }
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // ── Chart data ─────────────────────────────────────────
  const chartData = useMemo(
    () => generateHistory(selected.price, selected.changePct, range, selected.symbol),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected.symbol, range]
  );

  // ── Sparklines (generated once) ────────────────────────
  const sparklines = useMemo(
    () =>
      Object.fromEntries(
        ASSETS.map((a) => [a.symbol, generateSparkline(a.price, a.changePct, a.symbol)])
      ),
    []
  );

  // ── Order book ─────────────────────────────────────────
  const orderBook = useMemo(
    () => generateOrderBook(selected.price, selected.symbol),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected.symbol, Math.round(selected.price / 10)]
  );

  const chromeOffset = layout.chromeHeight;

  // ─────────────────────────────────────────────────────────
  // Simple view
  // ─────────────────────────────────────────────────────────

  if (viewMode === "simple") {
    return (
      <div
        className="overflow-y-auto"
        style={{ minHeight: `calc(100dvh - ${chromeOffset})` }}
      >
        {/* Toggle — top-right, same position as in advanced view */}
        <div
          className="sticky top-0 z-[10] flex items-center justify-end border-b px-4 py-[9px]"
          style={{ background: colors.background, borderColor: colors.border }}
        >
          <ViewToggle mode={viewMode} onChange={handleViewChange} />
        </div>

        <SimpleView
          assets={assets}
          sparklines={sparklines}
          flashMap={flashMap}
          onRequestSignIn={() => setShowSignIn(true)}
        />

        {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Advanced view — 3-column terminal
  // ─────────────────────────────────────────────────────────

  return (
    <div
      className="flex"
      style={{ height: `calc(100dvh - ${chromeOffset})`, overflow: "hidden" }}
    >
      {/* ── LEFT: Asset list ─────────────────────────────── */}
      <aside
        className="flex flex-col overflow-y-auto border-r"
        style={{ width: 240, minWidth: 240, borderColor: colors.border, background: colors.background }}
      >
        <div
          className="sticky top-0 z-[1] flex items-center gap-[6px] border-b px-4 py-[10px]"
          style={{ background: colors.background, borderColor: colors.border }}
        >
          <Zap size={11} strokeWidth={2.5} style={{ color: colors.green }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: colors.green }}>
            Live Market
          </span>
        </div>

        {assets.map((asset) => {
          const assetUp = asset.change >= 0;
          const isSel = asset.symbol === selectedSymbol;
          const flash = flashMap[asset.symbol];

          return (
            <button
              key={asset.symbol}
              onClick={() => setSelectedSymbol(asset.symbol)}
              className="w-full border-b text-left transition-colors duration-100 hover:bg-[#0f0f0f]"
              style={{
                borderColor: colors.borderSubtle,
                background: isSel ? colors.surface : "transparent",
                borderLeft: `2px solid ${isSel ? colors.green : "transparent"}`,
                paddingLeft: isSel ? 10 : 12,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold leading-snug" style={{ color: colors.textPrimary }}>
                    {asset.name}
                  </p>
                  <p className="mt-[1px] text-[10px] uppercase tracking-wider" style={{ color: colors.textMuted }}>
                    PSA {asset.grade}
                  </p>
                </div>
                <SparklineChart data={sparklines[asset.symbol] ?? []} isUp={assetUp} width={56} height={26} />
              </div>
              <div className="mt-[6px] flex items-center justify-between">
                <span
                  className="tabular-nums text-[13px] font-bold"
                  style={{
                    color: flash ? (flash === "up" ? colors.green : colors.red) : colors.textPrimary,
                    transition: "color 0.35s ease",
                  }}
                >
                  {formatCurrency(asset.price)}
                </span>
                <span className="tabular-nums text-[11px] font-semibold" style={{ color: assetUp ? colors.green : colors.red }}>
                  {assetUp ? "+" : ""}{asset.changePct.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
      </aside>

      {/* ── CENTER: Chart + Stats + Grid ─────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto" style={{ background: colors.background }}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-4"
          style={{ borderColor: colors.border }}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold leading-tight tracking-tight" style={{ color: colors.textPrimary }}>
                {selected.name}
              </h1>
              <div
                className="rounded-[6px] px-2 py-[3px]"
                style={{ background: colors.greenMuted, border: `1px solid ${colors.green}33` }}
              >
                <span className="text-[10px] font-bold tracking-wide" style={{ color: colors.green }}>
                  PSA {selected.grade}
                </span>
              </div>
            </div>
            <p className="mt-[3px] text-[11px] uppercase tracking-wider" style={{ color: colors.textMuted }}>
              {selected.symbol} · {selected.set}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular-nums text-[28px] font-bold leading-none tracking-tight" style={{ color: colors.textPrimary }}>
              {formatCurrency(selected.price)}
            </p>
            <div className="mt-[5px] flex items-center justify-end gap-[5px]">
              {isUp
                ? <TrendingUp size={13} strokeWidth={2.5} style={{ color: colors.green }} />
                : <TrendingDown size={13} strokeWidth={2.5} style={{ color: colors.red }} />
              }
              <span className="tabular-nums text-[13px] font-semibold" style={{ color: isUp ? colors.green : colors.red }}>
                {isUp ? "+" : ""}{formatCurrency(selected.change)} ({isUp ? "+" : ""}{selected.changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 pt-5 pb-2">
          <PriceChart data={chartData} isUp={isUp} range={range} onRangeChange={setRange} />
        </div>

        <div className="mx-6 my-3 grid grid-cols-4 overflow-hidden rounded-[10px] border"
          style={{ borderColor: colors.border, background: colors.surface }}>
          {[
            { label: "24H High", value: formatCurrency(selected.high24h) },
            { label: "24H Low",  value: formatCurrency(selected.low24h) },
            { label: "Volume",   value: `${selected.volume24h} cop.` },
            { label: "Category", value: selected.category === "pokemon" ? "Pokémon" : "Sports" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={cn("flex flex-col gap-[4px] px-4 py-3", i < 3 && "border-r")}
              style={{ borderColor: colors.borderSubtle }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                {stat.label}
              </span>
              <span className="tabular-nums text-[13px] font-semibold" style={{ color: colors.textPrimary }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        <div className="px-6 pb-8">
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: colors.textMuted }}>
            All Assets
          </h2>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            {assets.map((asset) => {
              const assetUp = asset.change >= 0;
              const isSel = asset.symbol === selectedSymbol;
              return (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedSymbol(asset.symbol)}
                  className="flex items-center justify-between rounded-[10px] border px-3 py-[10px] text-left transition-all duration-150 hover:border-[#3e3e3e]"
                  style={{
                    borderColor: isSel ? colors.green + "66" : colors.border,
                    background: isSel ? colors.greenMuted : colors.surface,
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold leading-tight" style={{ color: colors.textPrimary }}>
                      {asset.name}
                    </p>
                    <p className="mt-[2px] text-[10px] uppercase tracking-wider" style={{ color: colors.textMuted }}>
                      PSA {asset.grade} · {asset.category === "pokemon" ? "Pokémon" : "Sports"}
                    </p>
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    <p className="tabular-nums text-[13px] font-bold" style={{ color: colors.textPrimary }}>
                      {formatCurrency(asset.price, { compact: true })}
                    </p>
                    <p className="mt-[1px] tabular-nums text-[11px] font-semibold" style={{ color: assetUp ? colors.green : colors.red }}>
                      {assetUp ? "+" : ""}{asset.changePct.toFixed(2)}%
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── RIGHT: Toggle + Order book + Trade panel ─────── */}
      <aside
        className="flex flex-col overflow-hidden border-l"
        style={{ width: 280, minWidth: 280, borderColor: colors.border, background: colors.background }}
      >
        {/* Toggle row */}
        <div
          className="flex items-center justify-end border-b px-3 py-[9px]"
          style={{ background: colors.background, borderColor: colors.border }}
        >
          <ViewToggle mode={viewMode} onChange={handleViewChange} />
        </div>

        {/* Order Book label */}
        <div
          className="border-b px-3 py-[8px]"
          style={{ borderColor: colors.border }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: colors.textMuted }}>
            Order Book
          </span>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden border-b" style={{ borderColor: colors.border }}>
          <div className="flex-1 overflow-y-auto">
            <OrderBook orderBook={orderBook} />
          </div>
        </div>

        <div className="overflow-y-auto">
          <TradePanel asset={selected} onRequestSignIn={() => setShowSignIn(true)} />
        </div>
      </aside>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
