DO $$
DECLARE
  v_card RECORD;
  v_current_price DECIMAL;
  v_price DECIMAL;
  v_day INT;
BEGIN
  -- Clear existing data just in case
  DELETE FROM price_history;

  -- Loop through all cards that have a price
  FOR v_card IN 
    SELECT c.id, p.price 
    FROM cards c 
    JOIN prices p ON c.id = p.card_id
  LOOP
    v_current_price := v_card.price;
    
    -- Insert 90 days of history for this card
    FOR v_day IN 0..89 LOOP
      -- Work backward: the older the date, the more random walk it has from today
      -- We'll just generate a fake walk.
      v_price := v_current_price * (1 + (random() * 0.1 - 0.05));
      IF v_price < 1 THEN v_price := 1; END IF;

      INSERT INTO price_history (card_id, price, recorded_at)
      VALUES (v_card.id, round(v_price::numeric, 2), NOW() - (v_day || ' days')::INTERVAL);
      
      -- Update current price for the next iteration (older day)
      v_current_price := v_price;
    END LOOP;
  END LOOP;
END;
$$;
