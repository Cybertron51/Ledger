"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { colors, layout } from "@/lib/theme";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { Transaction, TxType, TxStatus } from "@/lib/db/transactions";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type FilterType = "all" | "buy" | "sell" | "deposit";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function TxIcon({ type }: { type: TxType }) {
  if (type === "buy" || type === "deposit") {
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: colors.greenMuted }}
      >
        <ArrowDownLeft size={16} style={{ color: colors.green }} />
      </div>
    );
  }
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{ background: colors.redMuted }}
    >
      <ArrowUpRight size={16} style={{ color: colors.red }} />
    </div>
  );
}

function StatusBadge({ status }: { status: TxStatus }) {
  if (status === "settled") {
    return (
      <div className="flex items-center gap-[4px]">
        <CheckCircle2 size={11} style={{ color: colors.green }} />
        <span className="text-[10px] font-semibold" style={{ color: colors.green }}>
          Settled
        </span>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-center gap-[4px]">
        <Clock size={11} style={{ color: colors.gold }} />
        <span className="text-[10px] font-semibold" style={{ color: colors.gold }}>
          Pending
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-[4px]">
      <XCircle size={11} style={{ color: colors.textMuted }} />
      <span className="text-[10px] font-semibold" style={{ color: colors.textMuted }}>
        Cancelled
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ totalTrades: 0, settled: 0, pending: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch transactions from Supabase ───────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchData() {
      const { getUserTransactions, getUserTransactionSummary } = await import("@/lib/db/transactions");
      const [txns, stats] = await Promise.all([
        getUserTransactions(),
        getUserTransactionSummary(),
      ]);

      if (!isMounted) return;
      setTransactions(txns);
      setSummary(stats);
      setIsLoading(false);
    }

    fetchData();
    return () => { isMounted = false; };
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4"
        style={{ minHeight: `calc(100dvh - ${layout.chromeHeight})`, background: colors.background }}
      >
        <p className="text-[14px]" style={{ color: colors.textMuted }}>
          Sign in to view your history
        </p>
        <Link
          href="/"
          className="rounded-[10px] px-5 py-[10px] text-[13px] font-semibold"
          style={{ background: colors.green, color: colors.textInverse }}
        >
          Go to Market
        </Link>
      </div>
    );
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "buy", label: "Buys" },
    { key: "sell", label: "Sells" },
    { key: "deposit", label: "Deposits" },
  ];

  const filtered = transactions.filter((tx) =>
    activeFilter === "all" ? true : tx.type === activeFilter
  );

  return (
    <div
      className="mx-auto max-w-xl px-4 py-8"
      style={{ minHeight: `calc(100dvh - ${layout.chromeHeight})`, background: colors.background }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold" style={{ color: colors.textPrimary }}>
          Transaction History
        </h1>
        <p className="mt-[4px] text-[12px]" style={{ color: colors.textMuted }}>
          All orders and account activity
        </p>
      </div>

      {/* Summary cards */}
      <div
        className="mb-6 grid grid-cols-3 overflow-hidden rounded-[12px] border"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        {[
          { label: "Total Trades", value: summary.totalTrades.toString() },
          { label: "Settled", value: summary.settled.toString() },
          { label: "Pending", value: summary.pending.toString() },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="flex flex-col gap-[3px] px-4 py-3"
            style={{ borderRight: i < 2 ? `1px solid ${colors.border}` : undefined }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
              {stat.label}
            </span>
            <span className="tabular-nums text-[16px] font-bold" style={{ color: colors.textPrimary }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex gap-2">
        <Filter size={13} className="shrink-0 self-center" style={{ color: colors.textMuted }} />
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className="rounded-full px-3 py-[5px] text-[11px] font-semibold transition-colors"
            style={{
              background: activeFilter === f.key ? colors.green : colors.surface,
              color: activeFilter === f.key ? colors.textInverse : colors.textMuted,
              border: `1px solid ${activeFilter === f.key ? colors.green : colors.border}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-[12px] border py-14"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <Loader2 size={24} style={{ color: colors.textMuted, animation: "spin 1s linear infinite" }} />
          <p className="text-[13px]" style={{ color: colors.textMuted }}>
            Loading transactions…
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-[12px] border py-14"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          <Clock size={24} style={{ color: colors.textMuted }} />
          <p className="text-[13px]" style={{ color: colors.textMuted }}>
            No transactions yet
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-[12px] border"
          style={{ borderColor: colors.border, background: colors.surface }}
        >
          {filtered.map((tx, i) => {
            const isExpanded = expanded === tx.id;
            const isBuyOrDeposit = tx.type === "buy" || tx.type === "deposit";
            const label =
              tx.type === "deposit"
                ? "Cash Deposit"
                : tx.type === "withdrawal"
                  ? "Withdrawal"
                  : tx.cardName
                    ? `${tx.type === "buy" ? "Bought" : "Sold"} ${tx.cardName}`
                    : tx.type;

            return (
              <div key={tx.id}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : tx.id)}
                  className="flex w-full items-center gap-3 px-4 py-[14px] text-left transition-colors hover:bg-[#2a2a2a]"
                  style={{
                    borderBottom:
                      i < filtered.length - 1 || isExpanded
                        ? `1px solid ${colors.border}`
                        : undefined,
                  }}
                >
                  <TxIcon type={tx.type} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold" style={{ color: colors.textPrimary }}>
                      {label}
                    </p>
                    <div className="mt-[3px] flex items-center gap-2">
                      {tx.grade && (
                        <span className="text-[10px]" style={{ color: colors.textMuted }}>
                          PSA {tx.grade}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: colors.textMuted }}>
                        {timeAgo(tx.timestamp)}
                      </span>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className="tabular-nums text-[14px] font-bold"
                      style={{ color: isBuyOrDeposit ? colors.green : colors.red }}
                    >
                      {isBuyOrDeposit ? "+" : "−"}
                      {formatCurrency(tx.amount)}
                    </p>
                    {tx.quantity && tx.quantity > 1 && (
                      <p className="text-[10px]" style={{ color: colors.textMuted }}>
                        ×{tx.quantity}
                      </p>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${colors.border}` : undefined, background: colors.surfaceRaised }}
                  >
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                          Date
                        </p>
                        <p className="text-[11px]" style={{ color: colors.textSecondary }}>
                          {formatDate(tx.timestamp)}
                        </p>
                      </div>
                      {tx.priceEach && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                            Price Each
                          </p>
                          <p className="tabular-nums text-[11px]" style={{ color: colors.textSecondary }}>
                            {formatCurrency(tx.priceEach)}
                          </p>
                        </div>
                      )}
                      {tx.txHash && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                            On-Chain Tx
                          </p>
                          <p className="truncate font-mono text-[10px]" style={{ color: colors.textSecondary }}>
                            {tx.txHash}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
