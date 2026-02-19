"use client";

/**
 * LEDGER — Vault Page
 *
 * Two-column layout:
 *   Left  (280px) — vault holdings list with live prices + gain/loss
 *   Right (flex)  — empty state OR selected card detail panel
 */

import { useState, useEffect } from "react";
import { Lock, X } from "lucide-react";
import Image from "next/image";

import { ASSETS, tickPrice } from "@/lib/market-data";
import { VAULT_HOLDINGS, type VaultHolding } from "@/lib/vault-data";
import { colors, layout, psaGradeColor, zIndex } from "@/lib/theme";
import { formatCurrency, cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type ModalState =
  | { type: "list"; holdingId: string; price: string }
  | { type: "withdraw"; holdingId: string }
  | null;

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function VaultPage() {
  const [holdings, setHoldings] = useState<VaultHolding[]>(VAULT_HOLDINGS);
  const [assets, setAssets] = useState(ASSETS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);

  // ── Live price tick ────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets((prev) => prev.map((a) => (Math.random() > 0.45 ? a : tickPrice(a))));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // ── Derived values ─────────────────────────────────────
  const priceMap = Object.fromEntries(assets.map((a) => [a.symbol, a.price]));
  const selected = holdings.find((h) => h.id === selectedId) ?? null;
  const totalValue = holdings.reduce((sum, h) => sum + (priceMap[h.symbol] ?? 0), 0);

  // ── Action handlers ────────────────────────────────────
  function openListModal(id: string) {
    const holding = holdings.find((h) => h.id === id);
    if (!holding) return;
    const price = priceMap[holding.symbol] ?? 0;
    setModalState({ type: "list", holdingId: id, price: price.toFixed(2) });
  }

  function confirmListing() {
    if (!modalState || modalState.type !== "list") return;
    const price = parseFloat(modalState.price);
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === modalState.holdingId
          ? { ...h, status: "listed", listingPrice: isNaN(price) ? undefined : price }
          : h
      )
    );
    setModalState(null);
  }

  function handleCancelListing(id: string) {
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, status: "in_vault", listingPrice: undefined } : h
      )
    );
  }

  function openWithdrawModal(id: string) {
    setModalState({ type: "withdraw", holdingId: id });
  }

  function confirmWithdrawal() {
    if (!modalState || modalState.type !== "withdraw") return;
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === modalState.holdingId ? { ...h, status: "in_transit" } : h
      )
    );
    setModalState(null);
  }

  // ── Modal holding lookup ───────────────────────────────
  const modalHolding = modalState
    ? holdings.find((h) => h.id === modalState.holdingId) ?? null
    : null;
  const modalValue = modalHolding ? (priceMap[modalHolding.symbol] ?? 0) : 0;

  return (
    <div
      className="flex"
      style={{
        height: `calc(100dvh - ${layout.chromeHeight})`,
        overflow: "hidden",
      }}
    >
      {/* ══════════════════════════════════════════════════
          LEFT — Holdings list
      ══════════════════════════════════════════════════ */}
      <aside
        className="flex flex-col overflow-y-auto border-r"
        style={{
          width: 280,
          minWidth: 280,
          borderColor: colors.border,
          background: colors.background,
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-[1] border-b px-4 py-3"
          style={{
            background: colors.background,
            borderColor: colors.border,
          }}
        >
          <p
            className="text-[16px] font-bold leading-tight"
            style={{ color: colors.textPrimary }}
          >
            Vault
          </p>
          <p
            className="mt-[2px] tabular-nums text-[20px] font-bold leading-tight tracking-tight"
            style={{ color: colors.textPrimary }}
          >
            {formatCurrency(totalValue)}
          </p>
          <p
            className="mt-[1px] text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: colors.textMuted }}
          >
            Total Value
          </p>
        </div>

        {/* Holdings rows */}
        {holdings.map((holding) => {
          const currentValue = priceMap[holding.symbol] ?? 0;
          const gain = currentValue - holding.acquisitionPrice;
          const isGain = gain >= 0;
          const isSel = holding.id === selectedId;
          const gradeColor = psaGradeColor[holding.grade as 8 | 9 | 10] ?? colors.textSecondary;

          return (
            <button
              key={holding.id}
              onClick={() => setSelectedId(holding.id)}
              className="w-full border-b text-left transition-colors duration-100 hover:bg-[#0f0f0f]"
              style={{
                borderColor: colors.borderSubtle,
                background: isSel ? colors.greenMuted : "transparent",
                borderLeft: `2px solid ${isSel ? colors.green : "transparent"}`,
                paddingLeft: isSel ? 10 : 12,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
              }}
            >
              <div className="flex items-start gap-2">
                {/* Card thumbnail */}
                <div
                  className="shrink-0 overflow-hidden rounded-[4px]"
                  style={{
                    width: 32,
                    height: 44,
                    border: `1px solid ${colors.border}`,
                    background: colors.surface,
                  }}
                >
                  <Image
                    src={holding.imageUrl}
                    alt={holding.name}
                    width={32}
                    height={44}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    unoptimized
                  />
                </div>
                {/* Text content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <p
                      className="truncate text-[12px] font-semibold leading-snug"
                      style={{ color: colors.textPrimary }}
                    >
                      {holding.name}
                    </p>
                    {/* PSA badge */}
                    <div
                      className="shrink-0 rounded-[5px] px-[6px] py-[2px]"
                      style={{
                        background: `${gradeColor}18`,
                        border: `1px solid ${gradeColor}44`,
                      }}
                    >
                      <span
                        className="text-[10px] font-bold tracking-wide"
                        style={{ color: gradeColor }}
                      >
                        PSA {holding.grade}
                      </span>
                    </div>
                  </div>
                  <p
                    className="mt-[1px] truncate text-[10px] uppercase tracking-wider"
                    style={{ color: colors.textMuted }}
                  >
                    {holding.set}
                  </p>
                  <div className="mt-[4px] flex items-center justify-between">
                    <span
                      className="tabular-nums text-[13px] font-bold"
                      style={{ color: colors.textPrimary }}
                    >
                      {formatCurrency(currentValue)}
                    </span>
                    <span
                      className="tabular-nums text-[11px] font-semibold"
                      style={{ color: isGain ? colors.green : colors.red }}
                    >
                      {isGain ? "+" : ""}
                      {formatCurrency(gain)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </aside>

      {/* ══════════════════════════════════════════════════
          RIGHT — Detail panel or empty state
      ══════════════════════════════════════════════════ */}
      <main
        className="flex min-w-0 flex-1 flex-col overflow-y-auto"
        style={{ background: colors.background }}
      >
        {selected === null ? (
          // Empty state
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Lock size={32} strokeWidth={1.5} style={{ color: colors.textMuted }} />
            <p
              className="text-[13px]"
              style={{ color: colors.textMuted }}
            >
              Select a card to view details
            </p>
          </div>
        ) : (
          <DetailPanel
            holding={selected}
            currentValue={priceMap[selected.symbol] ?? 0}
            onOpenListModal={openListModal}
            onCancelListing={handleCancelListing}
            onOpenWithdrawModal={openWithdrawModal}
          />
        )}
      </main>

      {/* ══════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════ */}
      {modalState && modalHolding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: zIndex.modal,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setModalState(null)}
        >
          {/* Modal panel — stop propagation so clicking inside doesn't close */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              width: 400,
              padding: 24,
            }}
          >
            {modalState.type === "list" ? (
              <ListModal
                holding={modalHolding}
                price={modalState.price}
                marketPrice={modalValue}
                onPriceChange={(p) =>
                  setModalState({ type: "list", holdingId: modalState.holdingId, price: p })
                }
                onCancel={() => setModalState(null)}
                onConfirm={confirmListing}
              />
            ) : (
              <WithdrawModal
                holding={modalHolding}
                currentValue={modalValue}
                onCancel={() => setModalState(null)}
                onConfirm={confirmWithdrawal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Detail Panel
// ─────────────────────────────────────────────────────────

interface DetailPanelProps {
  holding: VaultHolding;
  currentValue: number;
  onOpenListModal: (id: string) => void;
  onCancelListing: (id: string) => void;
  onOpenWithdrawModal: (id: string) => void;
}

function DetailPanel({
  holding,
  currentValue,
  onOpenListModal,
  onCancelListing,
  onOpenWithdrawModal,
}: DetailPanelProps) {
  const gain = currentValue - holding.acquisitionPrice;
  const gainPct = (gain / holding.acquisitionPrice) * 100;
  const isGain = gain >= 0;
  const gradeColor = psaGradeColor[holding.grade as 8 | 9 | 10] ?? colors.textSecondary;

  // Status config
  const statusConfig = {
    in_vault: { label: "In Vault", bg: colors.greenMuted, color: colors.green },
    in_transit: { label: "In Transit", bg: "rgba(245, 200, 66, 0.15)", color: "#F5C842" },
    listed: { label: "Listed for Sale", bg: colors.surface, color: colors.textSecondary },
  } as const;

  const status = statusConfig[holding.status];

  return (
    <div className="p-6">
      {/* Header */}
      <div
        className="flex flex-wrap items-start justify-between gap-4 border-b pb-5"
        style={{ borderColor: colors.border }}
      >
        {/* Card image + name/badge group */}
        <div className="flex items-start gap-4">
          {/* Card image */}
          <div
            className="shrink-0 overflow-hidden rounded-[8px]"
            style={{
              width: 120,
              height: 168,
              border: `1px solid ${colors.border}`,
              background: colors.surface,
            }}
          >
            <Image
              src={holding.imageUrl}
              alt={holding.name}
              width={120}
              height={168}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              unoptimized
            />
          </div>
          {/* Name + badge + set */}
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-[20px] font-bold leading-tight tracking-tight"
                style={{ color: colors.textPrimary }}
              >
                {holding.name}
              </h1>
              {/* PSA grade badge */}
              <div
                className="rounded-[6px] px-2 py-[3px]"
                style={{
                  background: `${gradeColor}18`,
                  border: `1px solid ${gradeColor}44`,
                }}
              >
                <span
                  className="text-[10px] font-bold tracking-wide"
                  style={{ color: gradeColor }}
                >
                  PSA {holding.grade}
                </span>
              </div>
            </div>
            <p
              className="mt-[4px] text-[11px] uppercase tracking-wider"
              style={{ color: colors.textMuted }}
            >
              {holding.set} · {holding.year}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div
          className="rounded-[8px] px-3 py-[5px]"
          style={{ background: status.bg, border: `1px solid ${status.color}44` }}
        >
          <span
            className="text-[11px] font-semibold"
            style={{ color: status.color }}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="mt-5 grid grid-cols-4 overflow-hidden rounded-[10px] border"
        style={{ borderColor: colors.border, background: colors.surface }}
      >
        {[
          { label: "Current Value", value: formatCurrency(currentValue), valueColor: colors.textPrimary },
          { label: "Acquisition Price", value: formatCurrency(holding.acquisitionPrice), valueColor: colors.textPrimary },
          {
            label: "Gain / Loss",
            value: `${isGain ? "+" : ""}${formatCurrency(gain)} (${isGain ? "+" : ""}${gainPct.toFixed(1)}%)`,
            valueColor: isGain ? colors.green : colors.red,
          },
          { label: "Date Deposited", value: holding.dateDeposited, valueColor: colors.textPrimary },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={cn("flex flex-col gap-[4px] px-4 py-3", i < 3 && "border-r")}
            style={{ borderColor: colors.borderSubtle }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: colors.textMuted }}
            >
              {stat.label}
            </span>
            <span
              className="tabular-nums text-[13px] font-semibold"
              style={{ color: stat.valueColor }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex gap-3">
        {/* List for Sale / Cancel Listing button */}
        {holding.status === "in_vault" && (
          <button
            onClick={() => onOpenListModal(holding.id)}
            className="flex-1 rounded-[10px] px-4 py-[10px] text-[13px] font-semibold transition-colors duration-150"
            style={{
              background: colors.green,
              color: colors.textInverse,
              cursor: "pointer",
              border: `1px solid ${colors.green}`,
            }}
          >
            List for Sale
          </button>
        )}
        {holding.status === "listed" && (
          <button
            onClick={() => onCancelListing(holding.id)}
            className="flex-1 rounded-[10px] px-4 py-[10px] text-[13px] font-semibold transition-colors duration-150"
            style={{
              background: "transparent",
              color: colors.red,
              cursor: "pointer",
              border: `1px solid ${colors.red}`,
            }}
          >
            Cancel Listing
          </button>
        )}
        {holding.status === "in_transit" && (
          <button
            disabled
            className="flex-1 rounded-[10px] px-4 py-[10px] text-[13px] font-semibold"
            style={{
              background: colors.surface,
              color: colors.textMuted,
              cursor: "not-allowed",
              border: `1px solid ${colors.border}`,
            }}
          >
            List for Sale
          </button>
        )}

        {/* Request Withdrawal button */}
        {holding.status === "in_vault" && (
          <button
            onClick={() => onOpenWithdrawModal(holding.id)}
            className="flex-1 rounded-[10px] px-4 py-[10px] text-[13px] font-semibold transition-colors duration-150"
            style={{
              background: colors.surface,
              color: colors.textPrimary,
              cursor: "pointer",
              border: `1px solid ${colors.border}`,
            }}
          >
            Request Withdrawal
          </button>
        )}
        {holding.status === "listed" && (
          <button
            disabled
            className="flex-1 rounded-[10px] px-4 py-[10px] text-[13px] font-semibold"
            style={{
              background: colors.surface,
              color: colors.textMuted,
              cursor: "not-allowed",
              border: `1px solid ${colors.borderSubtle}`,
            }}
          >
            Request Withdrawal
          </button>
        )}
        {holding.status === "in_transit" && (
          <button
            disabled
            className="flex-1 rounded-[10px] px-4 py-[10px] text-[13px] font-semibold"
            style={{
              background: colors.surface,
              color: colors.textMuted,
              cursor: "not-allowed",
              border: `1px solid ${colors.borderSubtle}`,
            }}
          >
            In Transit
          </button>
        )}
      </div>

      {/* PSA cert number */}
      <p
        className="mt-5 text-[11px]"
        style={{ color: colors.textMuted }}
      >
        {holding.certNumber}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// List for Sale Modal
// ─────────────────────────────────────────────────────────

interface ListModalProps {
  holding: VaultHolding;
  price: string;
  marketPrice: number;
  onPriceChange: (p: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function ListModal({ holding, price, marketPrice, onPriceChange, onCancel, onConfirm }: ListModalProps) {
  return (
    <>
      {/* Modal header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <span
          style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 700 }}
        >
          List for Sale
        </span>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: colors.textMuted,
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={16} />
        </button>
      </div>
      <p style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 20 }}>
        {holding.name} · PSA {holding.grade}
      </p>

      {/* Price input */}
      <label
        style={{
          display: "block",
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        Asking Price
      </label>
      <input
        type="number"
        value={price}
        onChange={(e) => onPriceChange(e.target.value)}
        style={{
          width: "100%",
          background: colors.surfaceOverlay,
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: 600,
          padding: "10px 12px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <p style={{ color: colors.textMuted, fontSize: 11, marginTop: 6, marginBottom: 24 }}>
        Market price: {formatCurrency(marketPrice)}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            background: colors.green,
            border: `1px solid ${colors.green}`,
            borderRadius: 10,
            color: colors.textInverse,
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Confirm Listing →
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Request Withdrawal Modal
// ─────────────────────────────────────────────────────────

interface WithdrawModalProps {
  holding: VaultHolding;
  currentValue: number;
  onCancel: () => void;
  onConfirm: () => void;
}

function WithdrawModal({ holding, currentValue, onCancel, onConfirm }: WithdrawModalProps) {
  const fee = currentValue * 0.05;
  const net = currentValue * 0.95;

  return (
    <>
      {/* Modal header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <span
          style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 700 }}
        >
          Request Withdrawal
        </span>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: colors.textMuted,
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={16} />
        </button>
      </div>
      <p style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 20 }}>
        {holding.name} · PSA {holding.grade}
      </p>

      {/* Fee breakdown */}
      <div
        style={{
          background: colors.surfaceOverlay,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: colors.textSecondary, fontSize: 13 }}>Card Value</span>
          <span style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>
            {formatCurrency(currentValue)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: colors.textSecondary, fontSize: 13 }}>Withdrawal Fee</span>
          <span style={{ color: colors.gold, fontSize: 13, fontWeight: 700 }}>
            −{formatCurrency(fee)}{" "}
            <span style={{ color: colors.goldMuted.includes("rgba") ? colors.gold : colors.gold, fontSize: 11, fontWeight: 500 }}>
              (5%)
            </span>
          </span>
        </div>
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            paddingTop: 12,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>You Receive</span>
          <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 700 }}>
            {formatCurrency(net)}
          </span>
        </div>
      </div>

      {/* Warning */}
      <div
        style={{
          background: colors.goldMuted,
          border: `1px solid ${colors.gold}44`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 20,
        }}
      >
        <p style={{ color: colors.gold, fontSize: 12, lineHeight: 1.5 }}>
          ⚠ Physical delivery takes 7–14 business days
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            background: colors.gold,
            border: `1px solid ${colors.gold}`,
            borderRadius: 10,
            color: colors.textInverse,
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Confirm Withdrawal →
        </button>
      </div>
    </>
  );
}
