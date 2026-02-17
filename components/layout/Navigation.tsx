"use client";

/**
 * Navigation — Top app bar below the Global Ticker.
 *
 * Contains:
 *  - Ledger wordmark + logo mark
 *  - Primary nav links (Market, Vault, Portfolio)
 *  - Search input (future: command palette)
 *  - Account / wallet avatar
 */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Vault,
  TrendingUp,
  Search,
  Bell,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { colors, layout } from "@/lib/theme";

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_LINKS: NavLink[] = [
  {
    href: "/",
    label: "Market",
    icon: <TrendingUp size={15} strokeWidth={2} />,
  },
  {
    href: "/vault",
    label: "Vault",
    icon: <Vault size={15} strokeWidth={2} />,
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: <BarChart2 size={15} strokeWidth={2} />,
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header
      className="sticky flex w-full items-center justify-between border-b px-6"
      style={{
        top: layout.tickerHeight,
        height: layout.navHeight,
        backgroundColor: colors.background,
        borderColor: colors.border,
        zIndex: 100,
      }}
    >
      {/* ── Wordmark ─────────────────────────────── */}
      <Link
        href="/"
        className="flex items-center gap-2 no-underline"
        aria-label="Ledger home"
      >
        <div
          className="flex items-center justify-center rounded-[8px]"
          style={{
            width: "28px",
            height: "28px",
            backgroundColor: colors.green,
          }}
        >
          <Zap size={15} strokeWidth={2.5} style={{ color: colors.textInverse }} />
        </div>
        <span
          className="text-[18px] font-bold tracking-tight"
          style={{ color: colors.textPrimary, letterSpacing: "-0.03em" }}
        >
          Ledger
        </span>
      </Link>

      {/* ── Primary Nav ──────────────────────────── */}
      <nav className="flex items-center gap-1" aria-label="Primary navigation">
        {NAV_LINKS.map(({ href, label, icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-[6px] rounded-[10px] px-3 py-[7px]",
                "text-[13px] font-medium transition-all duration-150",
                "hover:bg-[#1E1E1E]"
              )}
              style={{
                color: isActive ? colors.textPrimary : colors.textSecondary,
                backgroundColor: isActive ? colors.surface : "transparent",
              }}
              aria-current={isActive ? "page" : undefined}
            >
              {icon}
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Right Controls ───────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className="flex items-center gap-2 rounded-[10px] border px-3 py-[7px] text-[13px] transition-colors duration-150 hover:border-[#3E3E3E]"
          style={{
            color: colors.textMuted,
            borderColor: colors.border,
            backgroundColor: "transparent",
          }}
          aria-label="Search cards"
        >
          <Search size={14} strokeWidth={2} />
          <span>Search cards…</span>
          <kbd
            className="rounded-[4px] px-[5px] py-[1px] text-[10px] font-medium"
            style={{
              backgroundColor: colors.surfaceOverlay,
              color: colors.textMuted,
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors hover:bg-[#1E1E1E]"
          style={{ color: colors.textSecondary }}
          aria-label="Notifications"
        >
          <Bell size={16} strokeWidth={2} />
        </button>

        {/* Account avatar */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:border-[#3E3E3E]"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.textSecondary,
          }}
          aria-label="Account"
        >
          <User size={15} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

export default Navigation;
