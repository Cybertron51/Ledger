-- ============================================================
-- IDEMPOTENCY LEDGER — Stripe Integration
-- ============================================================

CREATE TABLE IF NOT EXISTS stripe_transactions (
  id           TEXT        PRIMARY KEY,     -- The Stripe Session ID or Payment Intent ID
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount       DECIMAL(14,2) NOT NULL,
  type         TEXT        NOT NULL,        -- 'deposit' or 'withdrawal'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_st_user_id ON stripe_transactions(user_id);
