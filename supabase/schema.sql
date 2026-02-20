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
