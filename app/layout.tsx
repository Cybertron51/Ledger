/**
 * TASH — Root Layout
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
import { Providers } from "@/components/providers/Providers";

import { layout } from "@/lib/theme";
import { getMarketCards } from "@/lib/db/cards";
import { mapDBCardToAssetData } from "@/lib/market-data";

// ─────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "tash — Trading Card Exchange",
    template: "%s · tash",
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
    title: "tash — Trading Card Exchange",
    description: "Institutional-grade trading for PSA-graded collectibles.",
    type: "website",
  },
};

// ─────────────────────────────────────────────────────────
// Layout Component
// ─────────────────────────────────────────────────────────

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dbCards = await getMarketCards({ limit: 12 });
  const tickerItems = dbCards && dbCards.length > 0
    ? dbCards.map(mapDBCardToAssetData)
    : [];

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Providers>
          {/* ── Fixed chrome: ticker + nav ── */}
          <div
            className="fixed left-0 right-0 top-0"
            style={{ zIndex: 110 }}
          >
            {tickerItems.length > 0 && <GlobalTicker items={tickerItems} />}
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
        </Providers>
      </body>
    </html>
  );
}
