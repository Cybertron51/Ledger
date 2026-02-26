# Ledger/Tash Master Project Prompt

Please act as an expert Next.js and Supabase developer. We are building "tash" (or "Ledger"), a Robinhood-style financial brokerage platform for trading authenticated physical collectibles (specifically Pokémon and Sports cards).

## High-Level Vision
Users can deposit cash, send physical cards to our vault, and buy/sell fractional or whole assets using a Central Limit Order Book (CLOB). The app should have a dark-mode, premium brokerage aesthetic with slick animations and real-time price updates.

## Tech Stack
- **Frontend Framework:** Next.js 14+ (App Router), React 19
- **Styling:** Tailwind CSS, Radix UI primitives, Lucide React icons
- **Animations:** Framer Motion
- **Backend/Database:** Supabase (PostgreSQL, Realtime, Storage, Auth, Edge Functions/RPCs)
- **Payments:** Stripe (mocked or real)
- **AI Processing:** Anthropic / Google Generative AI for card scanning

## Design System & Theme
- **Background:** Pure black (`#000000`)
- **Surfaces:** Elevated panels use `#1E1E1E`, `#2A2A2A`. Subtle borders `#2E2E2E`.
- **Primary Colors:** Robinhood Green (`#00C805`), Danger Red (`#FF5000`), PSA Gold (`#F5C842`).
- **Typography:** Inter / Geist font family. Compact, data-dense sizing.
- **Corner Radius:** 12px for primary cards/panels.
- **Layout:** 8px base grid. Maintain a fixed top chronological ticker and a left/right sidebar on desktop.
- Create a `lib/theme.ts` that exports all these constants for consistency in inline styles and Framer Motion.

## Database Schema (Supabase PostgreSQL)
You must write a comprehensive `schema.sql` that includes:
1. `cards`: The catalog of tradable assets (symbol, name, set_name, psa_grade, image_url).
2. `prices`: Current market price, 24h change, volume.
3. `price_history`: Append-only ledger of price ticks over time, auto-recorded via a Trigger on `prices`.
4. `profiles`: Links to `auth.users`, holds `cash_balance` and `locked_balance`. Auto-created via a Trigger on user signup.
5. `vault_holdings`: Specific physical items owned by users in the vault. Statuses: `pending_authentication`, `tradable`, `listed`, etc.
6. `trades`: Historical record of matched transactions.
7. `orders`: Bids and Asks for the CLOB (type: `buy`/`sell`, price, quantity, status: `open`/`filled`/`cancelled`).
8. **RPC Functions**:
   - `place_order`: Handles locking user cash (if buying) or locking vault asset (if selling), then crossing the book against open counter-orders. Must handle partial fills and return order ID.
   - `cancel_order`: Cancels an open order and refunds locked cash or unlocks the asset.
9. **RLS Policies**: Enable RLS. Public selects for cards/prices/history/orders/trades. Users can manage their own profiles/vault/orders.
10. **Storage**: Buckets for `scans` (user uploads) and `card_images` (catalog images).

## Core Application Features & Pages

### 1. Market Home (`/`)
- A dual-view market dashboard.
- **Simple View**: A clean grid of trading cards showing sparklines (using local canvas/SVG or Victory charts) and current prices.
- **Advanced View**: A 3-column trading terminal:
  - Left: Chronological list of live market assets with mini sparklines.
  - Center: Main Price Chart (interactive, ranges 1D, 1W, 1M, 1Y) or Image viewer, plus key statistics (24h high/low, pop count).
  - Right: Real-time Order Book showing Bids and Asks, and a Trade Panel to submit Buy/Sell limit orders.
- Integrate **Supabase Realtime** so prices flash green/red when a trade occurs.

### 2. Card Scanner (`/scan`)
- Mobile-first capture flow to add physical cards to the vault.
- Tabs for "Camera" (live video feed with capture button) and "Upload" (drag-and-drop / file picker).
- Once an image is captured, send it to an AI backend (e.g. Next.js API route using Gemini/Claude vision) to extract: Card Name, Set, Year, PSA Grade, Cert Number, and Condition.
- Show an "Analyzing" skeleton loader, then present a detailed Result view with a condition grid down to the corners and edges.
- Provide an "Add to Vault" button that saves a `vault_holdings` record with status `pending_authentication`.

### 3. Portfolio & Vault (`/portfolio` & `/vault`)
- **Portfolio**: Displays user's net worth (cash + total estimated value of vault items), daily P&L, purchasing power, and locked cash. Lists all grouped assets currently owned.
- **Vault**: A detailed logistical view showing all physical cards moving through the pipeline (Pending, Shipped, Authenticated, Tradable). Allow users to "Deposit" physical cards to the vault or "Withdraw" them for physical delivery.

### 4. Account & Banking (`/deposit`, `/withdraw`, `/account`)
- Forms to simulate or process fiat deposits/withdrawals to update the user's `cash_balance` in the `profiles` table.
- Use Stripe Elements for a slick UI (even if operating in test mode).

### 5. Authentication
- Create a branded, dark-mode `SignInModal` and a dedicated `/sign-up` page.
- During sign-up, immediately route new users to an `/onboarding` questionnaire (collecting Favorite TCGs, Investment Goals, etc.) before taking them to the main app.
- Protect relevant routes (trading, scanning, banking) so unauthenticated users see the sign-in prompt instead.

## Implementation Steps
1. **Setup**: Initialize Next.js app, configure Tailwind plugins, install `@supabase/supabase-js`, `lucide-react`, `framer-motion`.
2. **Backend**: Provide the full `schema.sql` and explain how to apply it in the Supabase SQL Editor.
3. **Contexts & Providers**: Create `AuthContext` to sync the Supabase session, and `PortfolioContext` to fetch user balances and vault holdings.
4. **UI Components**: Build reusable layouts (Left nav, Top ticker) and Radix UI elements styled to match the dark theme.
5. **Pages**: Implement the market views, the order matching UI, the AI scan flow, and the portfolio logistics view.
6. **API Routes**: Implement `/api/scan` for handling vision LLM requests.

## Testing & Test-Driven Development (TDD)
You must employ a Test-Driven Development (TDD) lifecycle (Red-Green-Refactor) throughout the implementation.
- **Frontend**: Write tests using **Jest** and **React Testing Library** before implementing components and pages. Ensure high coverage for complex UI logic like the Order Book, fractional trade calculations, and formatters.
- **Backend**: Implement database testing using **pgTAP** or Supabase's local testing utilities. Write tests for the `place_order` and `cancel_order` RPCs to verify that they correctly handle partial fills, insufficient balances, and concurrent updates without race conditions.
- **API Tests**: Use a testing framework like Supertest to validate the Next.js API routes (especially the vision AI wrapper).

Please write the complete code for this structure, file by file, ensuring strict TypeScript safety throughout.
