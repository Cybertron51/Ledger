-- Enable Realtime for the 'prices' table
BEGIN;

-- Check if the publication 'supabase_realtime' exists, and if so add the table to it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE prices';
  END IF;
END
$$;

COMMIT;
