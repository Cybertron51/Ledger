-- Enable Row Level Security
ALTER TABLE stripe_transactions ENABLE ROW LEVEL SECURITY;
-- Users can only read their own transactions
DROP POLICY IF EXISTS "Users can read own stripe_transactions" ON stripe_transactions;
CREATE POLICY "Users can read own stripe_transactions"
  ON stripe_transactions FOR SELECT
  USING (auth.uid() = user_id);