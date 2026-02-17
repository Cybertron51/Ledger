import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as USD currency */
export function formatCurrency(
  value: number,
  opts: { decimals?: number; compact?: boolean } = {}
): string {
  const { decimals = 2, compact = false } = opts;

  if (compact && Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    });
    return formatter.format(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Format a price change with sign and percentage */
export function formatChange(change: number, changePct: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${formatCurrency(change)} (${sign}${changePct.toFixed(2)}%)`;
}

/** Format a large number with K/M/B suffix */
export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

/** Determine if a price change is positive/negative/neutral */
export function getPriceDirection(change: number): "up" | "down" | "flat" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}
