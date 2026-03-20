-- Add unique constraint to junction table to completely prevent concurrency-based double booking vulnerability
ALTER TABLE qr_code_holdings ADD CONSTRAINT qr_code_holdings_holding_id_key UNIQUE (holding_id);
