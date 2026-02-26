-- ============================================================
-- Migration: Fix Ambiguous place_order Function
-- DROPS the old 5-parameter version to resolve ambiguity with the 6-parameter CLOB version.
-- ============================================================

-- 1. Explicitly drop the old 5-parameter version that is causing ambiguity
-- Types match exactly what Postgres reported in the error message
DROP FUNCTION IF EXISTS public.place_order(
  uuid, -- p_user_id
  text, -- p_symbol
  text, -- p_type
  numeric, -- p_price
  integer -- p_quantity
);

-- 2. Drop and Re-create the 6-parameter version just to ensure everything is clean and in sync
DROP FUNCTION IF EXISTS public.place_order(
  uuid, 
  text, 
  text, 
  numeric, 
  integer, 
  uuid -- p_holding_id
);

-- 3. Re-define the CLOB-ready version (copied from the latest schema.sql)
CREATE OR REPLACE FUNCTION place_order(
  p_user_id UUID,
  p_symbol TEXT,
  p_type TEXT,
  p_price DECIMAL,
  p_quantity INTEGER,
  p_holding_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_new_order_id UUID;
  v_rem_qty INTEGER := p_quantity;
  v_match RECORD;
  v_trade_price DECIMAL;
  v_buyer_balance DECIMAL;
  v_holding_owner UUID;
  v_holding_status TEXT;
  v_total_cost DECIMAL;
BEGIN
  -- Validate
  IF p_type = 'sell' AND (p_quantity != 1 OR p_holding_id IS NULL) THEN
    RAISE EXCEPTION 'Sell orders must have quantity=1 and a specific holding_id';
  END IF;

  IF p_type = 'buy' AND p_holding_id IS NOT NULL THEN
    RAISE EXCEPTION 'Buy orders cannot have a holding_id';
  END IF;

  -- 1. Initial Insert / Fund Locking / Asset Locking
  IF p_type = 'buy' THEN
    v_total_cost := p_price * p_quantity;
    SELECT cash_balance INTO v_buyer_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF v_buyer_balance < v_total_cost THEN
      RAISE EXCEPTION 'Insufficient funds (You need % but have %)', v_total_cost, v_buyer_balance;
    END IF;
    
    -- Lock funds
    UPDATE profiles SET 
      cash_balance = cash_balance - v_total_cost,
      locked_balance = locked_balance + v_total_cost
    WHERE id = p_user_id;

    -- Insert order
    INSERT INTO orders (user_id, symbol, type, price, quantity, status)
    VALUES (p_user_id, p_symbol, p_type, p_price, p_quantity, 'open')
    RETURNING id INTO v_new_order_id;

    -- Attempt to match against ASKs
    FOR v_match IN
      SELECT o.id, o.user_id, o.price, o.quantity, o.holding_id
      FROM orders o
      WHERE o.symbol = p_symbol
        AND o.type = 'sell'
        AND o.status = 'open'
        AND o.user_id != p_user_id
        AND o.price <= p_price
      ORDER BY o.price ASC, o.created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_rem_qty = 0;

      v_trade_price := v_match.price;

      -- Double check the holding is still listed
      SELECT status, user_id INTO v_holding_status, v_holding_owner
      FROM vault_holdings WHERE id = v_match.holding_id FOR UPDATE;

      IF v_holding_status != 'listed' OR v_holding_owner != v_match.user_id THEN
        -- Somehow invalid, skip and cancel the bad ask
        UPDATE orders SET status = 'cancelled' WHERE id = v_match.id;
        CONTINUE;
      END IF;

      -- Execute Trade!
      -- 1. Buyer gets refund if match price < limit price
      UPDATE profiles SET 
        locked_balance = locked_balance - p_price,
        cash_balance = cash_balance + (p_price - v_trade_price)
      WHERE id = p_user_id;

      -- 2. Seller gets the cash
      UPDATE profiles SET cash_balance = cash_balance + v_trade_price WHERE id = v_match.user_id;

      -- 3. Transfer holding
      UPDATE vault_holdings 
        SET user_id = p_user_id, 
            status = 'tradable', 
            listing_price = NULL,
            acquisition_price = v_trade_price
        WHERE id = v_match.holding_id;

      -- 4. Record Trade & Update Prices
      INSERT INTO trades (holding_id, symbol, buyer_id, seller_id, price, executed_at)
      VALUES (v_match.holding_id, p_symbol, p_user_id, v_match.user_id, v_trade_price, NOW());

      UPDATE prices SET price = v_trade_price, volume_24h = volume_24h + 1 WHERE card_id = (SELECT id FROM cards WHERE symbol = p_symbol);

      -- 5. Update quantities
      UPDATE orders SET status = 'filled', quantity = 0 WHERE id = v_match.id;
      v_rem_qty := v_rem_qty - 1;

    END LOOP;

  ELSE
    -- SELLING
    SELECT status, user_id INTO v_holding_status, v_holding_owner
    FROM vault_holdings WHERE id = p_holding_id FOR UPDATE;

    IF v_holding_owner != p_user_id OR v_holding_status NOT IN ('tradable') THEN
      RAISE EXCEPTION 'Holding is not yours or not tradable';
    END IF;

    -- Lock the matching holding
    UPDATE vault_holdings SET status = 'listed', listing_price = p_price WHERE id = p_holding_id;

    -- Insert the ask
    INSERT INTO orders (user_id, symbol, type, price, quantity, holding_id, status)
    VALUES (p_user_id, p_symbol, p_type, p_price, 1, p_holding_id, 'open')
    RETURNING id INTO v_new_order_id;

    -- Attempt to match against BIDs
    FOR v_match IN
      SELECT o.id, o.user_id, o.price, o.quantity
      FROM orders o
      WHERE o.symbol = p_symbol
        AND o.type = 'buy'
        AND o.status = 'open'
        AND o.user_id != p_user_id
        AND o.price >= p_price
      ORDER BY o.price DESC, o.created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_rem_qty = 0;
      
      -- For a bid hit by an ask, the trade happens at the resting BID's price
      v_trade_price := v_match.price;

      -- 1. Deduct from buyer's locked balance
      UPDATE profiles SET locked_balance = locked_balance - v_trade_price WHERE id = v_match.user_id;

      -- 2. Give cash to seller (p_user_id)
      UPDATE profiles SET cash_balance = cash_balance + v_trade_price WHERE id = p_user_id;

      -- 3. Transfer holding. It was 'listed', now goes to buyer as 'tradable'
      UPDATE vault_holdings 
        SET user_id = v_match.user_id, 
            status = 'tradable', 
            listing_price = NULL,
            acquisition_price = v_trade_price
        WHERE id = p_holding_id;

      -- 4. Record Trade & Update Prices
      INSERT INTO trades (holding_id, symbol, buyer_id, seller_id, price, executed_at)
      VALUES (p_holding_id, p_symbol, v_match.user_id, p_user_id, v_trade_price, NOW());

      UPDATE prices SET price = v_trade_price, volume_24h = volume_24h + 1 WHERE card_id = (SELECT id FROM cards WHERE symbol = p_symbol);

      -- 5. Update quantities
      IF v_match.quantity > 1 THEN
        UPDATE orders SET quantity = quantity - 1 WHERE id = v_match.id;
      ELSE
        UPDATE orders SET status = 'filled', quantity = 0 WHERE id = v_match.id;
      END IF;
      
      v_rem_qty := v_rem_qty - 1;
    END LOOP;
  END IF;

  -- 3. Finalize order status of the NEW order
  IF v_rem_qty = 0 THEN
    UPDATE orders SET status = 'filled', quantity = 0 WHERE id = v_new_order_id;
  ELSIF v_rem_qty < p_quantity THEN
    -- Partially filled
    UPDATE orders SET quantity = v_rem_qty WHERE id = v_new_order_id;
  END IF;

  RETURN v_new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
