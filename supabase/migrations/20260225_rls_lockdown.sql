-- ─────────────────────────────────────────────────────────
-- RLS Lockdown: Remove all public-read policies
--
-- Since all database reads now go through API routes using
-- the service role key (which bypasses RLS), we can deny
-- anonymous access to all tables.
--
-- The anon key will have zero database access after this.
-- ─────────────────────────────────────────────────────────

-- Profiles: only users can read their own profile
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

-- Vault Holdings: only users can read their own holdings
DROP POLICY IF EXISTS "Public read vault_holdings" ON vault_holdings;
CREATE POLICY "Users read own holdings"
  ON vault_holdings FOR SELECT USING (auth.uid() = user_id);

-- Cards: deny anonymous, allow authenticated users (service role bypasses)
DROP POLICY IF EXISTS "Public read cards" ON cards;
CREATE POLICY "Authenticated read cards"
  ON cards FOR SELECT USING (auth.uid() IS NOT NULL);

-- Prices: deny anonymous, allow authenticated users
DROP POLICY IF EXISTS "Public read prices" ON prices;
CREATE POLICY "Authenticated read prices"
  ON prices FOR SELECT USING (auth.uid() IS NOT NULL);

-- Price History: deny anonymous, allow authenticated users
DROP POLICY IF EXISTS "Public read price_history" ON price_history;
CREATE POLICY "Authenticated read price_history"
  ON price_history FOR SELECT USING (auth.uid() IS NOT NULL);

-- Orders: deny anonymous, allow authenticated users
-- Note: orders table is created in schema.sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public read orders" ON orders';
    EXECUTE 'CREATE POLICY "Authenticated read orders" ON orders FOR SELECT USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- Trades: tighten to only participants
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can read own trades" ON trades';
    EXECUTE 'CREATE POLICY "Users read own trades" ON trades FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id)';
  END IF;
END $$;
