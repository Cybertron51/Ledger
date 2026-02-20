"use client";

/**
 * Navigation — Top app bar below the Global Ticker.
 *
 * Right side shows either a "Sign In" button (unauthenticated)
 * or an account chip with the user's available balance + initials avatar.
 * No wallet or crypto language anywhere.
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, TrendingUp, Search, Bell, ChevronDown, Camera } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { colors, layout } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { SignInModal } from "@/components/auth/SignInModal";

// ─────────────────────────────────────────────────────────
// Nav links
// ─────────────────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_LINKS: NavLink[] = [
  { href: "/",          label: "Market",    icon: <TrendingUp size={15} strokeWidth={2} /> },
  { href: "/portfolio", label: "Portfolio", icon: <BarChart2  size={15} strokeWidth={2} /> },
  { href: "/scan",      label: "Upload",    icon: <Camera     size={15} strokeWidth={2} /> },
];

// ─────────────────────────────────────────────────────────
// Account chip — shown when signed in
// ─────────────────────────────────────────────────────────

function AccountChip() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-[10px] border px-[10px] py-[6px] transition-colors duration-150 hover:border-[#3E3E3E]"
        style={{
          borderColor: colors.border,
          background: colors.surface,
        }}
      >
        {/* Balance */}
        <span className="tabular-nums text-[12px] font-semibold" style={{ color: colors.textSecondary }}>
          {formatCurrency(user.cashBalance, { compact: true })}
        </span>

        {/* Divider */}
        <span className="h-3.5 w-px" style={{ background: colors.border }} />

        {/* Initials avatar */}
        <span
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-black"
          style={{ background: colors.green, color: colors.textInverse }}
        >
          {user.initials}
        </span>

        <ChevronDown
          size={12}
          strokeWidth={2.5}
          style={{
            color: colors.textMuted,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-[50]" onClick={() => setOpen(false)} />

          <div
            className="absolute right-0 top-[calc(100%+6px)] z-[51] w-[200px] overflow-hidden rounded-[12px] border py-1"
            style={{
              background: colors.surface,
              borderColor: colors.border,
              boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
            }}
          >
            {/* User info */}
            <div
              className="border-b px-4 py-3"
              style={{ borderColor: colors.borderSubtle }}
            >
              <p className="text-[13px] font-semibold" style={{ color: colors.textPrimary }}>
                {user.name}
              </p>
              <p className="mt-[2px] text-[11px]" style={{ color: colors.textMuted }}>
                {user.email}
              </p>
            </div>

            {/* Balance row */}
            <div
              className="border-b px-4 py-3"
              style={{ borderColor: colors.borderSubtle }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                Available Balance
              </p>
              <p className="mt-[3px] tabular-nums text-[16px] font-bold" style={{ color: colors.textPrimary }}>
                {formatCurrency(user.cashBalance)}
              </p>
            </div>

            {/* Actions */}
            {[
              { label: "Account Settings", href: "/account" },
              { label: "Transaction History", href: "/history" },
              { label: "Deposit Funds", href: "/deposit" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-[9px] text-[13px] transition-colors hover:bg-[#2A2A2A]"
                style={{ color: colors.textSecondary }}
              >
                {item.label}
              </Link>
            ))}

            <div className="my-1 border-t" style={{ borderColor: colors.borderSubtle }} />

            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="w-full px-4 py-[9px] text-left text-[13px] transition-colors hover:bg-[#2A2A2A]"
              style={{ color: colors.red }}
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────

export function Navigation() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
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
        <Link href="/" className="flex items-center gap-2 no-underline" aria-label="Ledger home">
          <div
            className="flex items-center justify-center rounded-[8px]"
            style={{ width: 28, height: 28, backgroundColor: colors.green }}
          >
            <span className="text-[14px] font-black" style={{ color: colors.textInverse }}>
              L
            </span>
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
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
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
            style={{ color: colors.textMuted, borderColor: colors.border }}
            aria-label="Search cards"
          >
            <Search size={14} strokeWidth={2} />
            <span>Search cards…</span>
            <kbd
              className="rounded-[4px] px-[5px] py-[1px] text-[10px] font-medium"
              style={{ backgroundColor: colors.surfaceOverlay, color: colors.textMuted }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Notifications — only shown when signed in */}
          {isAuthenticated && (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors hover:bg-[#1E1E1E]"
              style={{ color: colors.textSecondary }}
              aria-label="Notifications"
            >
              <Bell size={16} strokeWidth={2} />
            </button>
          )}

          {/* Auth control */}
          {isAuthenticated ? (
            <AccountChip />
          ) : (
            <button
              onClick={() => setShowSignIn(true)}
              className="rounded-[10px] px-4 py-[7px] text-[13px] font-semibold transition-all duration-150 active:scale-[0.98]"
              style={{ background: colors.green, color: colors.textInverse }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Sign-in modal */}
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </>
  );
}

export default Navigation;
