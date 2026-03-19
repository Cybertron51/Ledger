-- Add 'received' as a valid intermediate status for qr_codes.
-- Flow: pending → submitted → received → completed
ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_status_check;
ALTER TABLE qr_codes
  ADD CONSTRAINT qr_codes_status_check
  CHECK (status IN ('pending', 'submitted', 'received', 'completed'));
