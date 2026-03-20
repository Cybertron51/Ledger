-- 1. Drop the old status check constraint on vault_holdings
ALTER TABLE vault_holdings DROP CONSTRAINT vault_holdings_status_check;

-- 2. Add the updated constraint allowing 'drop_off'
ALTER TABLE vault_holdings ADD CONSTRAINT vault_holdings_status_check
CHECK (status IN (
  'pending_authentication',
  'shipped',
  'drop_off',
  'received',
  'authenticating',
  'tradable',
  'withdrawn',
  'listed',
  'returning',
  'disapproved'
));

-- 3. Convert any existing QR-code cards that are currently 'shipped' into 'drop_off'
UPDATE vault_holdings
SET status = 'drop_off'
WHERE status = 'shipped'
  AND id IN (
    SELECT holding_id FROM qr_code_holdings
  );
