-- ============================================================
-- LEDGER — Card Catalog Schema
-- Run this in the Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- ── Card Catalog ────────────────────────────────────────────
-- One row per unique card × PSA grade combination.
-- e.g. Charizard Holo PSA 10 is a different row from PSA 9.

CREATE TABLE IF NOT EXISTS cards (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Trading identity
  symbol          TEXT        UNIQUE NOT NULL,  -- e.g. "CHAR10-BASE-1999"
  name            TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'pokemon'
                              CHECK (category IN ('pokemon', 'sports', 'mtg', 'other')),

  -- Card metadata
  set_name        TEXT        NOT NULL,
  set_id          TEXT,                          -- pokemontcg.io set ID, e.g. "base1"
  year            INTEGER,
  rarity          TEXT,
  artist          TEXT,
  hp              INTEGER,
  card_types      TEXT[],                        -- ["Fire"], ["Water", "Psychic"]
  card_number     TEXT,                          -- number within set, e.g. "4/102"

  -- PSA grading
  psa_grade       INTEGER     NOT NULL CHECK (psa_grade IN (8, 9, 10)),
  population      INTEGER     DEFAULT 0,         -- PSA pop report count at this grade

  -- Images (from pokemontcg.io or uploaded)
  image_url       TEXT,                          -- standard resolution ~245x342px
  image_url_hi    TEXT,                          -- high resolution ~734x1024px

  -- Source tracking
  pokemon_card_id TEXT,                          -- pokemontcg.io card ID, e.g. "base1-4"

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Current Prices ──────────────────────────────────────────
-- One row per card, upserted by the price-tick job.

CREATE TABLE IF NOT EXISTS prices (
  card_id         UUID        PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  price           DECIMAL(14,2) NOT NULL,
  change_24h      DECIMAL(14,2) DEFAULT 0,
  change_pct_24h  DECIMAL(10,4) DEFAULT 0,
  high_24h        DECIMAL(14,2),
  low_24h         DECIMAL(14,2),
  volume_24h      INTEGER       DEFAULT 0,
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Price History ───────────────────────────────────────────
-- Append-only ledger of price ticks for charting.

CREATE TABLE IF NOT EXISTS price_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  price       DECIMAL(14,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auto-record Price History ────────────────────────────────
-- Automatically log a new row whenever `prices.price` changes.

CREATE OR REPLACE FUNCTION log_price_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if the price actually changed (or if it's a brand new insert)
  IF (TG_OP = 'INSERT') OR (OLD.price IS DISTINCT FROM NEW.price) THEN
    INSERT INTO price_history (card_id, price, recorded_at)
    VALUES (NEW.card_id, NEW.price, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_price_history ON prices;
CREATE TRIGGER trg_log_price_history
  AFTER INSERT OR UPDATE ON prices
  FOR EACH ROW
  EXECUTE FUNCTION log_price_history();

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cards_category      ON cards(category);
CREATE INDEX IF NOT EXISTS idx_cards_psa_grade     ON cards(psa_grade);
CREATE INDEX IF NOT EXISTS idx_cards_set_id        ON cards(set_id);
CREATE INDEX IF NOT EXISTS idx_cards_pokemon_id    ON cards(pokemon_card_id);
CREATE INDEX IF NOT EXISTS idx_cards_symbol        ON cards(symbol);
CREATE INDEX IF NOT EXISTS idx_ph_card_time        ON price_history(card_id, recorded_at DESC);

-- ── Row Level Security ──────────────────────────────────────
-- Public read access. Writes require service role key (only seeder/backend).

ALTER TABLE cards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public read cards"         ON cards;
DROP POLICY IF EXISTS "Public read prices"        ON prices;
DROP POLICY IF EXISTS "Public read price_history" ON price_history;

CREATE POLICY "Public read cards"
  ON cards FOR SELECT USING (true);

CREATE POLICY "Public read prices"
  ON prices FOR SELECT USING (true);

CREATE POLICY "Public read price_history"
  ON price_history FOR SELECT USING (true);

-- ── Auto-update updated_at ──────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cards_updated_at ON cards;
CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Profiles ────────────────────────────────────────────────
-- Maps to auth.users, holds balances and identity data.

CREATE TABLE IF NOT EXISTS profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT        NOT NULL UNIQUE,
  name           TEXT,
  cash_balance   DECIMAL(14,2) NOT NULL DEFAULT 25000.00,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

-- Auto-update updated_at for profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, cash_balance)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    25000.00
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── Vault Holdings ──────────────────────────────────────────
-- Represents a user's physical asset in the escrow flow or vault

CREATE TABLE IF NOT EXISTS vault_holdings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id          UUID        REFERENCES cards(id) ON DELETE RESTRICT,
  symbol           TEXT        NOT NULL,                      -- denormalized from cards for easy lookup
  
  status           TEXT        NOT NULL DEFAULT 'pending_authentication'
                               CHECK (status IN (
                                 'pending_authentication',
                                 'shipped',
                                 'received',
                                 'authenticating',
                                 'tradable',
                                 'withdrawn',
                                 'listed'
                               )),
  
  acquisition_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  listing_price     DECIMAL(14,2),                            -- only set when status = 'listed'
  
  cert_number      TEXT,                                      -- PSA cert number
  image_url        TEXT,                                      -- user uploaded photo or default card image
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for vault_holdings
CREATE INDEX IF NOT EXISTS idx_vh_user_id ON vault_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_vh_card_id ON vault_holdings(card_id);
CREATE INDEX IF NOT EXISTS idx_vh_status  ON vault_holdings(status);

-- RLS
ALTER TABLE vault_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read vault_holdings" ON vault_holdings;

CREATE POLICY "Public read vault_holdings"
  ON vault_holdings FOR SELECT USING (true);
  
-- Auto-update updated_at for vault_holdings
DROP TRIGGER IF EXISTS trg_vh_updated_at ON vault_holdings;
CREATE TRIGGER trg_vh_updated_at
  BEFORE UPDATE ON vault_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Trades Ledger ─────────────────────────────────────────────
-- Records each matched trade so the app can show history.

CREATE TABLE IF NOT EXISTS trades (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id   UUID        NOT NULL REFERENCES vault_holdings(id) ON DELETE CASCADE,
  symbol       TEXT        NOT NULL,
  buyer_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price        DECIMAL(14,2) NOT NULL,
  executed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_symbol    ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_buyer_id  ON trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON trades(seller_id);

-- RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own trades" ON trades;
CREATE POLICY "Users can read own trades"
  ON trades FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);


-- ── Asset Transfer (RPC) ────────────────────────────────────
-- Atomically exchanges cash for a vault_holding card.

CREATE OR REPLACE FUNCTION match_order(
  p_buyer_id UUID,
  p_seller_id UUID,
  p_holding_id UUID,
  p_price DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_buyer_balance DECIMAL;
  v_holding_status TEXT;
  v_holding_owner UUID;
  v_symbol TEXT;
BEGIN
  -- 1. Ensure the buyer has enough balance
  SELECT cash_balance INTO v_buyer_balance FROM profiles WHERE id = p_buyer_id FOR UPDATE;
  IF v_buyer_balance < p_price THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  -- 2. Ensure holding is actually listed & belongs to seller
  SELECT status, user_id, symbol INTO v_holding_status, v_holding_owner, v_symbol
    FROM vault_holdings 
    WHERE id = p_holding_id FOR UPDATE;

  IF v_holding_owner != p_seller_id THEN
    RAISE EXCEPTION 'Holding does not belong to seller';
  END IF;
  
  IF v_holding_status != 'listed' THEN
    RAISE EXCEPTION 'Holding is not listed for sale';
  END IF;

  -- 3. Deduct from buyer
  UPDATE profiles SET cash_balance = cash_balance - p_price WHERE id = p_buyer_id;

  -- 4. Add to seller
  UPDATE profiles SET cash_balance = cash_balance + p_price WHERE id = p_seller_id;

  -- 5. Transfer card ownership & reset status to tradable
  UPDATE vault_holdings 
    SET user_id = p_buyer_id, 
        status = 'tradable', 
        listing_price = NULL,
        acquisition_price = p_price
    WHERE id = p_holding_id;

  -- 6. Record trade in ledger
  INSERT INTO trades (holding_id, symbol, buyer_id, seller_id, price, executed_at)
  VALUES (p_holding_id, v_symbol, p_buyer_id, p_seller_id, p_price, NOW());

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Storage ─────────────────────────────────────────────────
-- Set up "scans" bucket for user uploaded images

INSERT INTO storage.buckets (id, name, public) 
VALUES ('scans', 'scans', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the scans bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'scans');

-- Allow authenticated users to upload scans
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'scans' AND 
  auth.role() = 'authenticated'
);

-- ── Limit Orders (Bids & Asks) ──────────────────────────────
-- Represents an open intent to buy or sell a card at a specific price

CREATE TABLE IF NOT EXISTS orders (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol       TEXT        NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN ('buy', 'sell')),
  
  -- The maximum willing to pay (for bids) or minimum willing to accept (for asks)
  price        DECIMAL(14,2) NOT NULL,
  
  -- The number of items wanted or offered. 
  -- When match_order runs successfully on a 1-quantity match, this is decremented.
  -- When quantity hits 0, the order is 'filled'. 
  quantity     INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  
  status       TEXT        NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open', 'filled', 'cancelled')),
                           
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_type_symbol ON orders(type, symbol);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_price ON orders(price);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read orders" ON orders;
CREATE POLICY "Public read orders"
  ON orders FOR SELECT USING (true);
  
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
  
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Order Execution Logic ─────────────────────────────────
-- This function processes a new order, attempting to immediately match it
-- against existing open orders on the book.
-- If unmatched quantity remains, the order stays 'open'.

CREATE OR REPLACE FUNCTION place_order(
  p_user_id UUID,
  p_symbol TEXT,
  p_type TEXT,
  p_price DECIMAL,
  p_quantity INTEGER
) RETURNS UUID AS $$
DECLARE
  v_new_order_id UUID;
  v_rem_qty INTEGER := p_quantity;
  v_match RECORD;
  v_holding_id UUID;
  v_trade_price DECIMAL;
BEGIN
  -- 1. Insert the order initially
  INSERT INTO orders (user_id, symbol, type, price, quantity, status)
  VALUES (p_user_id, p_symbol, p_type, p_price, p_quantity, 'open')
  RETURNING id INTO v_new_order_id;

  -- 2. Attempt to match
  IF p_type = 'buy' THEN
    -- We are BUYING. We want to find the lowest ASKS (sells) <= our bid
    FOR v_match IN
      SELECT o.id, o.user_id, o.price, o.quantity
      FROM orders o
      WHERE o.symbol = p_symbol
        AND o.type = 'sell'
        AND o.status = 'open'
        AND o.user_id != p_user_id
        AND o.price <= p_price
      ORDER BY o.price ASC, o.created_at ASC
    LOOP
      EXIT WHEN v_rem_qty = 0;

      -- Determine price (usually the maker's price, i.e. the existing resting order)
      v_trade_price := v_match.price;

      -- We need to find an actual physical card (vault_holding) owned by the seller
      SELECT id INTO v_holding_id
      FROM vault_holdings
      WHERE user_id = v_match.user_id
        AND symbol = p_symbol
        AND status IN ('tradable', 'in_vault')
      LIMIT 1 FOR UPDATE SKIP LOCKED;

      -- If the seller doesn't actually have the card anymore, skip this match
      IF v_holding_id IS NULL THEN
         CONTINUE;
      END IF;

      -- Attempt the atomic swap
      BEGIN
        -- Deduct from buyer
        UPDATE profiles SET cash_balance = cash_balance - v_trade_price WHERE id = p_user_id;
        
        -- Add to seller
        UPDATE profiles SET cash_balance = cash_balance + v_trade_price WHERE id = v_match.user_id;
        
        -- Transfer card ownership & reset status to tradable
        UPDATE vault_holdings 
          SET user_id = p_user_id, 
              status = 'tradable', 
              listing_price = NULL,
              acquisition_price = v_trade_price
          WHERE id = v_holding_id;

        -- Record trade in ledger
        INSERT INTO trades (holding_id, symbol, buyer_id, seller_id, price, executed_at)
        VALUES (v_holding_id, p_symbol, p_user_id, v_match.user_id, v_trade_price, NOW());

        -- Update the last traded price
        UPDATE prices
          SET price = v_trade_price,
              volume_24h = volume_24h + 1
          WHERE card_id = (SELECT id FROM cards WHERE symbol = p_symbol);

        -- Update order quantities
        v_rem_qty := v_rem_qty - 1;
        
        UPDATE orders SET quantity = quantity - 1 
        WHERE id = v_match.id;

        -- We only matched 1 unit. The seller's order might have had more, but we only took 1 holding.
        -- If their order quantity hit 0, mark filled.
        UPDATE orders SET status = 'filled' WHERE id = v_match.id AND quantity = 0;

      EXCEPTION WHEN OTHERS THEN
         -- Catch specifically insufficient funds, let it roll back the single trade attempt and break loop
         IF SQLERRM = 'Insufficient funds' OR SQLSTATE = '23514' THEN
           RAISE NOTICE 'Insufficient funds for trade';
           EXIT;
         END IF;
         RAISE;
      END;
    END LOOP;

  ELSE
    -- We are SELLING. We want to find the highest BIDS (buys) >= our ask
    -- This means the seller is hitting a resting bid
    
    -- Ensure seller has enough tradable assets before matching
    SELECT id INTO v_holding_id
    FROM vault_holdings
    WHERE user_id = p_user_id
      AND symbol = p_symbol
      AND status IN ('tradable', 'in_vault')
    LIMIT 1 FOR UPDATE SKIP LOCKED;

    IF v_holding_id IS NULL THEN
      -- Automatically cancel the order if they don't have the assets
      UPDATE orders SET status = 'cancelled' WHERE id = v_new_order_id;
      RETURN v_new_order_id;
    END IF;


    FOR v_match IN
      SELECT o.id, o.user_id, o.price, o.quantity
      FROM orders o
      WHERE o.symbol = p_symbol
        AND o.type = 'buy'
        AND o.status = 'open'
        AND o.user_id != p_user_id
        AND o.price >= p_price
      ORDER BY o.price DESC, o.created_at ASC
    LOOP
      EXIT WHEN v_rem_qty = 0;

      v_trade_price := v_match.price;

      BEGIN
        -- Deduct from buyer (rested order)
        UPDATE profiles SET cash_balance = cash_balance - v_trade_price WHERE id = v_match.user_id;

        -- Add to seller (taker order)
        UPDATE profiles SET cash_balance = cash_balance + v_trade_price WHERE id = p_user_id;

        -- Transfer card ownership & reset status to tradable
        UPDATE vault_holdings 
          SET user_id = v_match.user_id, 
              status = 'tradable', 
              listing_price = NULL,
              acquisition_price = v_trade_price
          WHERE id = v_holding_id;

        -- Record trade in ledger
        INSERT INTO trades (holding_id, symbol, buyer_id, seller_id, price, executed_at)
        VALUES (v_holding_id, p_symbol, v_match.user_id, p_user_id, v_trade_price, NOW());

        -- Update the last traded price
        UPDATE prices
          SET price = v_trade_price,
              volume_24h = volume_24h + 1
          WHERE card_id = (SELECT id FROM cards WHERE symbol = p_symbol);

        -- Update order quantities
        v_rem_qty := v_rem_qty - 1;
        
        UPDATE orders SET quantity = quantity - 1 
        WHERE id = v_match.id;

        UPDATE orders SET status = 'filled' WHERE id = v_match.id AND quantity = 0;

        -- After matched one card, seller might still want to sell more. 
        -- Re-query for next holding
        IF v_rem_qty > 0 THEN
           v_holding_id := NULL;
           SELECT id INTO v_holding_id
           FROM vault_holdings
           WHERE user_id = p_user_id
             AND symbol = p_symbol
             AND status IN ('tradable', 'in_vault')
           LIMIT 1 FOR UPDATE SKIP LOCKED;
           
           IF v_holding_id IS NULL THEN
             EXIT; -- Stop matching if out of inventory
           END IF;
        END IF;

      EXCEPTION WHEN OTHERS THEN
         IF SQLERRM = 'Insufficient funds' OR SQLSTATE = '23514' THEN
           -- If buyer doesn't have funds, auto cancel their resting bid and continue to next bid
           UPDATE orders SET status = 'cancelled' WHERE id = v_match.id;
           CONTINUE;
         END IF;
         RAISE;
      END;
    END LOOP;
  END IF;

  -- 3. Finalize order status
  IF v_rem_qty = 0 THEN
    UPDATE orders SET status = 'filled', quantity = 0 WHERE id = v_new_order_id;
  ELSIF v_rem_qty < p_quantity THEN
    UPDATE orders SET quantity = v_rem_qty WHERE id = v_new_order_id;
  END IF;

  RETURN v_new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
