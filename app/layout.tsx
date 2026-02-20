/**
 * LEDGER — Root Layout
 *
 * Hierarchy (top → bottom):
 *  ┌──────────────────────────────────────────┐
 *  │  GlobalTicker  (40px, fixed, z:110)      │  ← marquee price bar
 *  ├──────────────────────────────────────────┤
 *  │  Navigation    (56px, fixed, z:100)      │  ← nav + search + account
 *  ├──────────────────────────────────────────┤
 *  │                                          │
 *  │  <main> — page content area              │
 *  │                                          │
 *  └──────────────────────────────────────────┘
 */

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

import { GlobalTicker } from "@/components/layout/GlobalTicker";
import { Navigation } from "@/components/layout/Navigation";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { TOP_PSA10_ASSETS } from "@/lib/ticker-data";
import { layout } from "@/lib/theme";

// ─────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "Ledger — Trading Card Exchange",
    template: "%s · Ledger",
  },
  description:
    "Institutional-grade trading for PSA 8+ graded cards. Real-time price discovery, order books, and secure vault storage.",
  keywords: [
    "trading card exchange",
    "PSA",
    "graded cards",
    "Pokémon",
    "sports cards",
    "collectibles market",
  ],
  openGraph: {
    title: "Ledger — Trading Card Exchange",
    description: "Institutional-grade trading for PSA-graded collectibles.",
    type: "website",
  },
};

// ─────────────────────────────────────────────────────────
// Layout Component
// ─────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ClientProviders>
          {/* ── Fixed chrome: ticker + nav ── */}
          <div
            className="fixed left-0 right-0 top-0"
            style={{ zIndex: 110 }}
          >
            <GlobalTicker items={TOP_PSA10_ASSETS} />
            <Navigation />
          </div>

          {/* ── Page content — offset by chrome height (40px ticker + 56px nav) ── */}
          <main
            style={{
              paddingTop: layout.chromeHeight,
              minHeight: "100dvh",
            }}
          >
            {children}
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}
