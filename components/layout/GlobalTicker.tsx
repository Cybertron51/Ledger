"use client";

/**
 * GlobalTicker — Full-viewport-width marquee bar
 *
 * Displays real-time PSA 10 card price changes at the
 * very top of every page. Inspired by collectpure.com.
 *
 * Architecture:
 *  - The ticker track is duplicated (×2) so the marquee
 *    appears seamless as it loops.
 *  - Hover pauses the animation for readability.
 *  - Edge fade gradients mask the left/right overflow.
 */

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { colors } from "@/lib/theme";
import type { TickerItem } from "@/lib/ticker-data";

// ─────────────────────────────────────────────────────────
// Sub-component: single ticker item
// ─────────────────────────────────────────────────────────

interface TickerChipProps {
  item: TickerItem;
}

function TickerChip({ item }: TickerChipProps) {
  const isUp = item.change > 0;
  const isDown = item.change < 0;
  const sign = isUp ? "+" : "";

  return (
    <div
      className="flex items-center gap-[6px] px-4 select-none cursor-pointer group"
      title={`${item.name} · PSA ${item.grade} · ${item.set}`}
    >
      {/* Symbol */}
      <span
        className="text-[11px] font-semibold tracking-[0.06em] uppercase"
        style={{ color: colors.textMuted }}
      >
        {item.symbol}
      </span>

      {/* Price */}
      <span
        className="tabular-nums text-[12px] font-medium"
        style={{ color: colors.textPrimary }}
      >
        {formatCurrency(item.price)}
      </span>

      {/* Change badge */}
      <span
        className={cn(
          "flex items-center gap-[3px] tabular-nums text-[11px] font-semibold",
          "px-[6px] py-[2px] rounded-[6px] leading-none"
        )}
        style={{
          color: isUp
            ? colors.green
            : isDown
            ? colors.red
            : colors.textSecondary,
          backgroundColor: isUp
            ? colors.greenMuted
            : isDown
            ? colors.redMuted
            : "transparent",
        }}
      >
        {isUp ? (
          <TrendingUp size={10} strokeWidth={2.5} />
        ) : isDown ? (
          <TrendingDown size={10} strokeWidth={2.5} />
        ) : (
          <Minus size={10} strokeWidth={2.5} />
        )}
        {sign}{item.changePct.toFixed(2)}%
      </span>

      {/* Separator dot */}
      <span
        className="text-[10px]"
        style={{ color: colors.border }}
        aria-hidden="true"
      >
        ·
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

interface GlobalTickerProps {
  items: TickerItem[];
}

export function GlobalTicker({ items }: GlobalTickerProps) {
  // Duplicate the items so the marquee loops seamlessly
  const doubled = [...items, ...items];

  return (
    <div
      role="marquee"
      aria-label="Live card market prices"
      className="relative w-full overflow-hidden border-b"
      style={{
        height: "var(--ticker-height, 36px)",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        zIndex: 110,
      }}
    >
      {/* Left fade mask */}
      <div
        className="ticker-fade-left pointer-events-none absolute left-0 top-0 z-10 h-full w-12"
        aria-hidden="true"
      />

      {/* Scrolling track */}
      <div className="flex h-full items-center">
        <div className="ticker-track">
          {doubled.map((item, i) => (
            <TickerChip key={`${item.symbol}-${i}`} item={item} />
          ))}
        </div>
      </div>

      {/* Right fade mask */}
      <div
        className="ticker-fade-right pointer-events-none absolute right-0 top-0 z-10 h-full w-12"
        aria-hidden="true"
      />
    </div>
  );
}

export default GlobalTicker;
