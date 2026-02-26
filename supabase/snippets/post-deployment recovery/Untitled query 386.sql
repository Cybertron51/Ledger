DO $$
DECLARE
  v_card RECORD;
  v_current_price DECIMAL;
  v_price DECIMAL;
  v_day INT;
BEGIN
  DELETE FROM price_history;
  FOR v_card IN SELECT c.id, p.price FROM cards c JOIN prices p ON c.id = p.card_id LOOP
    v_current_price := v_card.price;
    FOR v_day IN 0..89 LOOP
      v_price := v_current_price * (1 + (random() * 0.1 - 0.05));
      IF v_price < 1 THEN v_price := 1; END IF;
      INSERT INTO price_history (card_id, price, recorded_at) VALUES (v_card.id, round(v_price::numeric, 2), NOW() - (v_day || ' days')::INTERVAL);
      v_current_price := v_price;
    END LOOP;
  END LOOP;
END;
$$;