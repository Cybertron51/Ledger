"use client";

/**
 * SimpleView — Portfolio-first casual experience.
 *
 * Inspired by Robinhood:
 *   - Portfolio value at a glance
 *   - Your holdings front and center, tap to trade inline
 *   - Search to discover new cards
 *   - Market list below for browsing
 */

import { useState, useMemo } from "react";
import { Search, ChevronRight, CheckCircle, Loader2, ExternalLink, Lock, X } from "lucide-react";
import { colors } from "@/lib/theme";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { SparklineChart } from "./SparklineChart";
import { VAULT_HOLDINGS } from "@/lib/vault-data";
import type { AssetData, PricePoint } from "@/lib/market-data";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface SimpleViewProps {
  assets: AssetData[];
  sparklines: Record<string, PricePoint[]>;
  flashMap: Record<string, "up" | "down">;
  onRequestSignIn: () => void;
}

type TradeSide = "buy" | "sell";

interface TradeState {
  symbol: string;
  side: TradeSide;
  quantity: number;
  stage: "form" | "submitting" | "confirmed" | "error";
  errorMsg?: string;
  txHash?: string;
}

// ─────────────────────────────────────────────────────────
// Inline trade form
// ─────────────────────────────────────────────────────────

function InlineTrade({
  asset,
  side,
  onClose,
}: {
  asset: AssetData;
  side: TradeSide;
  onClose: () => void;
}) {
  const { user, updateBalance } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [stage, setStage] = useState<"form" | "submitting" | "confirmed" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState<string | undefined>();

  const total = asset.price * quantity;
  const accent = side === "buy" ? colors.green : colors.red;
  const canAfford = side === "sell" || (user?.cashBalance ?? 0) >= total;

  async function handleConfirm() {
    if (!user) return;
    setStage("submitting");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          tokenId: asset.tokenId,
          priceUsd: asset.price,
          isBuy: side === "buy",
          quantity,
          cardName: asset.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order failed");

      if (side === "buy") updateBalance(-total);
      else updateBalance(total);

      setTxHash(data.txHash);
      setStage("confirmed");
      setTimeout(onClose, 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    }
  }

  if (stage === "submitting") {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin" style={{ color: colors.green }} />
        <span className="text-[12px]" style={{ color: colors.textMuted }}>Submitting…</span>
      </div>
    );
  }

  if (stage === "confirmed") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle size={22} strokeWidth={1.5} style={{ color: colors.green }} />
        <p className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>Confirmed</p>
        {txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px]"
            style={{ color: colors.green }}
          >
            View on-chain <ExternalLink size={10} />
          </a>
        )}
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <p className="text-[12px]" style={{ color: colors.red }}>{errorMsg}</p>
        <button onClick={() => setStage("form")} className="text-[11px]" style={{ color: colors.textMuted }}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="pt-3">
      {/* Side toggle */}
      <div className="mb-3 flex rounded-[8px] p-[3px]" style={{ background: colors.surfaceOverlay }}>
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            onClick={() => {/* side is fixed per holding expand, but could allow switching */}}
            className="flex-1 rounded-[6px] py-[6px] text-[12px] font-bold capitalize"
            style={{
              background: side === s ? (s === "buy" ? colors.greenMuted : colors.redMuted) : "transparent",
              color: side === s ? (s === "buy" ? colors.green : colors.red) : colors.textMuted,
              border: side === s ? `1px solid ${(s === "buy" ? colors.green : colors.red)}44` : "1px solid transparent",
            }}
          >
            {s === "buy" ? "Buy More" : "Sell"}
          </button>
        ))}
      </div>

      {/* Balance */}
      {user && (
        <div className="mb-3 flex justify-between">
          <span className="text-[11px]" style={{ color: colors.textMuted }}>Available cash</span>
          <span className="tabular-nums text-[11px] font-semibold" style={{ color: colors.textSecondary }}>
            {formatCurrency(user.cashBalance)}
          </span>
        </div>
      )}

      {/* Quantity */}
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[18px] font-bold"
          style={{ background: colors.surfaceRaised, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
        >−</button>
        <span className="flex-1 text-center tabular-nums text-[18px] font-bold" style={{ color: colors.textPrimary }}>
          {quantity}
        </span>
        <button
          onClick={() => setQuantity((q) => q + 1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[18px] font-bold"
          style={{ background: colors.surfaceRaised, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
        >+</button>
      </div>

      {/* Total */}
      <div className="mb-3 flex items-center justify-between rounded-[8px] px-3 py-[10px]"
        style={{ background: colors.surfaceRaised }}>
        <span className="text-[12px] font-semibold" style={{ color: colors.textPrimary }}>Total</span>
        <span className="tabular-nums text-[15px] font-bold" style={{ color: accent }}>
          {formatCurrency(total)}
        </span>
      </div>

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        disabled={!canAfford}
        className="w-full rounded-[10px] py-[11px] text-[13px] font-bold transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: accent, color: colors.textInverse }}
      >
        {!canAfford ? "Insufficient Funds" : `Confirm ${side === "buy" ? "Purchase" : "Sale"}`}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Holding row
// ─────────────────────────────────────────────────────────

function HoldingRow({
  holding,
  asset,
  sparkline,
  flash,
  expanded,
  onToggle,
  onRequestSignIn,
  isAuthenticated,
}: {
  holding: typeof VAULT_HOLDINGS[number];
  asset: AssetData;
  sparkline: PricePoint[];
  flash: "up" | "down" | undefined;
  expanded: string | null;   // "buy" | "sell" | null
  onToggle: (side: TradeSide | null) => void;
  onRequestSignIn: () => void;
  isAuthenticated: boolean;
}) {
  const isExpanded = expanded !== null;
  const currentValue = asset.price;
  const gainLoss = currentValue - holding.acquisitionPrice;
  const gainPct = (gainLoss / holding.acquisitionPrice) * 100;
  const isGain = gainLoss >= 0;

  return (
    <div
      className="border-b"
      style={{ borderColor: colors.borderSubtle }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Left: name + grade + gain */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold" style={{ color: colors.textPrimary }}>
              {holding.name}
            </p>
            <span
              className="shrink-0 rounded-[4px] px-[6px] py-[2px] text-[9px] font-bold tracking-wide"
              style={{ background: colors.greenMuted, color: colors.green }}
            >
              PSA {holding.grade}
            </span>
          </div>
          <p className="mt-[3px] text-[12px]" style={{ color: isGain ? colors.green : colors.red }}>
            {isGain ? "+" : ""}{formatCurrency(gainLoss)} ({isGain ? "+" : ""}{gainPct.toFixed(2)}%)
          </p>
        </div>

        {/* Center: sparkline */}
        <SparklineChart data={sparkline} isUp={asset.change >= 0} width={60} height={28} />

        {/* Right: price + chevron */}
        <div className="shrink-0 text-right">
          <p
            className="tabular-nums text-[14px] font-bold"
            style={{
              color: flash ? (flash === "up" ? colors.green : colors.red) : colors.textPrimary,
              transition: "color 0.35s ease",
            }}
          >
            {formatCurrency(currentValue, { compact: true })}
          </p>
          <p className="mt-[2px] tabular-nums text-[11px]" style={{ color: asset.change >= 0 ? colors.green : colors.red }}>
            {asset.change >= 0 ? "+" : ""}{asset.changePct.toFixed(2)}% today
          </p>
        </div>

        <ChevronRight
          size={14}
          strokeWidth={2}
          style={{
            color: colors.textMuted,
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
          className="cursor-pointer"
          onClick={() => {
            if (!isAuthenticated) { onRequestSignIn(); return; }
            onToggle(isExpanded ? null : "buy");
          }}
        />
      </div>

      {/* Expanded trade panel */}
      {isExpanded && (
        <div className="border-t px-5 pb-5" style={{ borderColor: colors.borderSubtle, background: colors.surface + "88" }}>
          {/* Buy / Sell quick select */}
          {expanded !== "buying" && expanded !== "selling" && (
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => onToggle("buy")}
                className="flex-1 rounded-[10px] py-[10px] text-[13px] font-bold transition-all active:scale-[0.98]"
                style={{ background: colors.green, color: colors.textInverse }}
              >
                Buy More
              </button>
              <button
                onClick={() => onToggle("sell")}
                className="flex-1 rounded-[10px] py-[10px] text-[13px] font-bold transition-all active:scale-[0.98]"
                style={{ background: colors.redMuted, color: colors.red, border: `1px solid ${colors.red}44` }}
              >
                Sell
              </button>
            </div>
          )}
          {(expanded === "buy" || expanded === "sell") && (
            <InlineTrade
              asset={asset}
              side={expanded as TradeSide}
              onClose={() => onToggle(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Market row (compact list item)
// ─────────────────────────────────────────────────────────

function MarketRow({
  asset,
  sparkline,
  flash,
  expanded,
  onToggle,
  onRequestSignIn,
  isAuthenticated,
}: {
  asset: AssetData;
  sparkline: PricePoint[];
  flash: "up" | "down" | undefined;
  expanded: boolean;
  onToggle: () => void;
  onRequestSignIn: () => void;
  isAuthenticated: boolean;
}) {
  const isUp = asset.change >= 0;

  return (
    <div className="border-b" style={{ borderColor: colors.borderSubtle }}>
      <button
        onClick={() => {
          if (!isAuthenticated) { onRequestSignIn(); return; }
          onToggle();
        }}
        className="flex w-full items-center gap-3 px-5 py-[14px] text-left transition-colors hover:bg-[#0f0f0f]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold" style={{ color: colors.textPrimary }}>
              {asset.name}
            </p>
            <span
              className="shrink-0 rounded-[4px] px-[6px] py-[2px] text-[9px] font-bold tracking-wide"
              style={{ background: colors.surfaceRaised, color: colors.textMuted }}
            >
              PSA {asset.grade}
            </span>
          </div>
          <p className="mt-[2px] text-[11px]" style={{ color: colors.textMuted }}>{asset.set}</p>
        </div>

        <SparklineChart data={sparkline} isUp={isUp} width={56} height={24} />

        <div className="shrink-0 text-right">
          <p
            className="tabular-nums text-[14px] font-bold"
            style={{
              color: flash ? (flash === "up" ? colors.green : colors.red) : colors.textPrimary,
              transition: "color 0.35s ease",
            }}
          >
            {formatCurrency(asset.price, { compact: true })}
          </p>
          <p className="mt-[2px] tabular-nums text-[11px] font-semibold" style={{ color: isUp ? colors.green : colors.red }}>
            {isUp ? "+" : ""}{asset.changePct.toFixed(2)}%
          </p>
        </div>

        <ChevronRight
          size={14} strokeWidth={2}
          style={{
            color: colors.textMuted,
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {expanded && (
        <div className="border-t px-5 pb-5" style={{ borderColor: colors.borderSubtle, background: colors.surface + "88" }}>
          <InlineTrade asset={asset} side="buy" onClose={onToggle} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SimpleView
// ─────────────────────────────────────────────────────────

export function SimpleView({ assets, sparklines, flashMap, onRequestSignIn }: SimpleViewProps) {
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [expandedHolding, setExpandedHolding] = useState<{ id: string; side: TradeSide | null } | null>(null);
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);

  // Match vault holdings to live asset prices
  const holdings = useMemo(() =>
    VAULT_HOLDINGS.map((h) => ({
      holding: h,
      asset: assets.find((a) => a.symbol === h.symbol),
    })).filter((h): h is { holding: typeof VAULT_HOLDINGS[number]; asset: AssetData } => !!h.asset),
    [assets]
  );

  // Portfolio math
  const holdingsValue = holdings.reduce((sum, { asset }) => sum + asset.price, 0);
  const cashBalance = user?.cashBalance ?? 24_500;
  const totalValue = cashBalance + holdingsValue;
  const dayGain = holdings.reduce((sum, { asset }) => sum + asset.change, 0);
  const dayGainPct = holdingsValue > 0 ? (dayGain / holdingsValue) * 100 : 0;
  const isDayUp = dayGain >= 0;

  // Portfolio symbols (to exclude from market section)
  const portfolioSymbols = new Set(VAULT_HOLDINGS.map((h) => h.symbol));

  // Market assets — exclude holdings, filter by search
  const marketAssets = useMemo(() => {
    const nonPortfolio = assets.filter((a) => !portfolioSymbols.has(a.symbol));
    if (!query.trim()) return nonPortfolio;
    const q = query.toLowerCase();
    return assets.filter((a) => a.name.toLowerCase().includes(q) || a.set.toLowerCase().includes(q));
  }, [assets, query]);

  return (
    <div className="mx-auto max-w-2xl">

      {/* ── Portfolio summary ──────────────────────────── */}
      <div className="px-5 pb-5 pt-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
          Portfolio Value
        </p>
        <p className="tabular-nums text-[36px] font-bold tracking-tight leading-none" style={{ color: colors.textPrimary }}>
          {formatCurrency(totalValue)}
        </p>
        <p className="mt-2 text-[14px] font-medium" style={{ color: isDayUp ? colors.green : colors.red }}>
          {isDayUp ? "+" : ""}{formatCurrency(dayGain)} ({isDayUp ? "+" : ""}{dayGainPct.toFixed(2)}%) today
        </p>
        {!isAuthenticated && (
          <button
            onClick={onRequestSignIn}
            className="mt-4 flex items-center gap-2 rounded-[12px] px-5 py-[11px] text-[14px] font-bold transition-all active:scale-[0.98]"
            style={{ background: colors.green, color: colors.textInverse }}
          >
            <Lock size={14} strokeWidth={2.5} />
            Sign In to Trade
          </button>
        )}
      </div>

      {/* ── Search ────────────────────────────────────── */}
      <div className="px-5 pb-4">
        <div
          className="flex items-center gap-3 rounded-[12px] px-4 py-[11px]"
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        >
          <Search size={15} strokeWidth={2} style={{ color: colors.textMuted, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search cards…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[14px]"
            style={{ color: colors.textPrimary }}
          />
          {query && (
            <button onClick={() => setQuery("")}>
              <X size={14} strokeWidth={2} style={{ color: colors.textMuted }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Holdings ──────────────────────────────────── */}
      {!query && (
        <section>
          <div className="flex items-center justify-between px-5 pb-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: colors.textMuted }}>
              Your Portfolio
            </h2>
            <span className="text-[11px]" style={{ color: colors.textMuted }}>
              {holdings.length} positions
            </span>
          </div>

          <div
            className="rounded-[14px] border overflow-hidden mx-5 mb-6"
            style={{ borderColor: colors.border, background: colors.background }}
          >
            {holdings.map(({ holding, asset }) => {
              const isThisExpanded = expandedHolding?.id === holding.id;
              return (
                <HoldingRow
                  key={holding.id}
                  holding={holding}
                  asset={asset}
                  sparkline={sparklines[asset.symbol] ?? []}
                  flash={flashMap[asset.symbol]}
                  expanded={isThisExpanded ? (expandedHolding?.side ?? null) : null}
                  onToggle={(side) => {
                    if (side === null) {
                      setExpandedHolding(null);
                    } else if (isThisExpanded && expandedHolding?.side === side) {
                      // Already showing this side — show buy/sell choice
                      setExpandedHolding({ id: holding.id, side });
                    } else {
                      setExpandedHolding({ id: holding.id, side });
                    }
                  }}
                  onRequestSignIn={onRequestSignIn}
                  isAuthenticated={isAuthenticated}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Market ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between px-5 pb-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: colors.textMuted }}>
            {query ? `Results for "${query}"` : "Market"}
          </h2>
          <span className="text-[11px]" style={{ color: colors.textMuted }}>
            {marketAssets.length} cards
          </span>
        </div>

        <div
          className="rounded-[14px] border overflow-hidden mx-5 mb-8"
          style={{ borderColor: colors.border, background: colors.background }}
        >
          {marketAssets.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[14px]" style={{ color: colors.textMuted }}>No cards match &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            marketAssets.map((asset) => (
              <MarketRow
                key={asset.symbol}
                asset={asset}
                sparkline={sparklines[asset.symbol] ?? []}
                flash={flashMap[asset.symbol]}
                expanded={expandedMarket === asset.symbol}
                onToggle={() => setExpandedMarket(expandedMarket === asset.symbol ? null : asset.symbol)}
                onRequestSignIn={onRequestSignIn}
                isAuthenticated={isAuthenticated}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
