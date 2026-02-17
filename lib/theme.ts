/**
 * LEDGER — Design Token System
 *
 * Single source of truth for all design decisions.
 * CSS custom properties are the runtime values; this
 * file provides type-safe references for use in
 * JS/TS contexts (inline styles, framer-motion, etc.)
 *
 * Design Mandate:
 *  - Dark Mode Brokerage aesthetic (Robinhood-style)
 *  - 8px base grid
 *  - 12px primary corner radius
 *  - Inter / Geist typography
 */

// ─────────────────────────────────────────────────────────
// Color Palette
// ─────────────────────────────────────────────────────────

export const colors = {
  /** Pure black application background */
  background: "#000000",

  /** Elevated card / panel surface */
  surface: "#1E1E1E",

  /** Secondary raised surface (tooltips, dropdowns) */
  surfaceRaised: "#2A2A2A",

  /** Tertiary overlay surface (modals) */
  surfaceOverlay: "#333333",

  /** Default border / divider */
  border: "#2E2E2E",

  /** Subtle / hairline border */
  borderSubtle: "#1A1A1A",

  // ── Brand: Gain / Loss ──────────────────────────────
  /** Positive price movement — primary green */
  green: "#00C805",
  greenDim: "#00A804",
  greenMuted: "rgba(0, 200, 5, 0.12)",
  greenGlow: "rgba(0, 200, 5, 0.25)",

  /** Negative price movement — danger orange-red */
  red: "#FF5000",
  redDim: "#D94300",
  redMuted: "rgba(255, 80, 0, 0.12)",
  redGlow: "rgba(255, 80, 0, 0.25)",

  // ── Text hierarchy ──────────────────────────────────
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0A0",
  textMuted: "#5A5A5A",
  textInverse: "#000000",

  // ── Accent: PSA Gold ────────────────────────────────
  /** PSA certification badge accent */
  gold: "#F5C842",
  goldMuted: "rgba(245, 200, 66, 0.15)",
} as const;

export type Color = keyof typeof colors;

// ─────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────

export const typography = {
  fontSans: '"Inter", var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", var(--font-geist-mono), ui-monospace, monospace',

  /** Font sizes (px) — Robinhood uses compact, data-dense sizing */
  size: {
    xs:   "11px",
    sm:   "12px",
    base: "13px",
    md:   "14px",
    lg:   "16px",
    xl:   "18px",
    "2xl": "22px",
    "3xl": "28px",
    "4xl": "36px",
  },

  /** Font weights */
  weight: {
    regular: "400",
    medium:  "500",
    semibold: "600",
    bold:    "700",
  },

  /** Line heights */
  leading: {
    none:    "1",
    tight:   "1.2",
    snug:    "1.35",
    normal:  "1.5",
    relaxed: "1.65",
  },

  /** Letter spacing */
  tracking: {
    tight:  "-0.02em",
    normal: "0em",
    wide:   "0.04em",
    wider:  "0.08em",
    caps:   "0.1em",
  },
} as const;

// ─────────────────────────────────────────────────────────
// Spacing — 8px Base Grid
// ─────────────────────────────────────────────────────────

export const spacing = {
  0:   "0px",
  0.5: "4px",   /* 0.5 × 8 */
  1:   "8px",   /* 1 × 8 */
  1.5: "12px",  /* 1.5 × 8 */
  2:   "16px",  /* 2 × 8 */
  2.5: "20px",  /* 2.5 × 8 */
  3:   "24px",  /* 3 × 8 */
  4:   "32px",  /* 4 × 8 */
  5:   "40px",  /* 5 × 8 */
  6:   "48px",  /* 6 × 8 */
  8:   "64px",  /* 8 × 8 */
  10:  "80px",  /* 10 × 8 */
  12:  "96px",  /* 12 × 8 */
} as const;

// ─────────────────────────────────────────────────────────
// Border Radius — 12px Primary
// ─────────────────────────────────────────────────────────

export const radius = {
  sm:   "8px",
  md:   "12px",   /* primary — used on cards, panels, buttons */
  lg:   "16px",
  xl:   "20px",
  full: "9999px", /* pills, avatars */
} as const;

// ─────────────────────────────────────────────────────────
// Shadows
// ─────────────────────────────────────────────────────────

export const shadows = {
  sm:    "0 1px 3px rgba(0,0,0,0.4)",
  md:    "0 4px 12px rgba(0,0,0,0.6)",
  lg:    "0 8px 32px rgba(0,0,0,0.8)",
  green: "0 0 20px rgba(0,200,5,0.2)",
  red:   "0 0 20px rgba(255,80,0,0.2)",
  gold:  "0 0 16px rgba(245,200,66,0.2)",
} as const;

// ─────────────────────────────────────────────────────────
// Motion — Framer Motion Variants
// ─────────────────────────────────────────────────────────

export const motion = {
  /** Spring for smooth Robinhood-style transitions */
  spring: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
    mass: 1,
  },

  /** Snappy spring for number tickers / price updates */
  springSnappy: {
    type: "spring" as const,
    stiffness: 600,
    damping: 35,
    mass: 0.8,
  },

  /** Smooth easing for page transitions */
  ease: [0.25, 0.1, 0.25, 1] as const,

  /** Duration presets (seconds) */
  duration: {
    instant: 0.1,
    fast:    0.2,
    normal:  0.35,
    slow:    0.5,
  },

  /** Page enter animation */
  pageIn: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -8 },
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },

  /** Fade-in for panels / cards */
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
    transition: { duration: 0.2 },
  },
} as const;

// ─────────────────────────────────────────────────────────
// Layout Constants
// ─────────────────────────────────────────────────────────

export const layout = {
  /** Global ticker bar height */
  tickerHeight:   "36px",

  /** Top navigation bar height (below ticker) */
  navHeight:      "56px",

  /** Combined chrome height for page offset calculations */
  chromeHeight:   "92px",

  /** Main content max-width */
  maxWidth:       "1440px",

  /** Sidebar / trade panel width */
  sidebarWidth:   "320px",

  /** Order book column width */
  orderBookWidth: "280px",
} as const;

// ─────────────────────────────────────────────────────────
// Z-Index Stack
// ─────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  1,
  overlay: 10,
  nav:     100,
  ticker:  110,
  modal:   200,
  toast:   300,
} as const;

// ─────────────────────────────────────────────────────────
// Breakpoints (mirrors Tailwind defaults)
// ─────────────────────────────────────────────────────────

export const breakpoints = {
  sm:  "640px",
  md:  "768px",
  lg:  "1024px",
  xl:  "1280px",
  "2xl": "1536px",
} as const;

// ─────────────────────────────────────────────────────────
// PSA Grade Config
// ─────────────────────────────────────────────────────────

/** Minimum PSA grade allowed for listing on Ledger */
export const PSA_MIN_GRADE = 8;

/** PSA grades eligible for trading */
export const PSA_ELIGIBLE_GRADES = [8, 9, 10] as const;
export type PSAGrade = (typeof PSA_ELIGIBLE_GRADES)[number];

/** Color mapping for PSA grades */
export const psaGradeColor: Record<PSAGrade, string> = {
  8:  colors.textSecondary,
  9:  colors.gold,
  10: colors.green,
};

// ─────────────────────────────────────────────────────────
// Consolidated theme export
// ─────────────────────────────────────────────────────────

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  layout,
  zIndex,
  breakpoints,
} as const;

export type Theme = typeof theme;
export default theme;
