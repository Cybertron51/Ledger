-- ── Storage ─────────────────────────────────────────────────
-- Set up "scans" bucket for user uploaded images

INSERT INTO storage.buckets (id, name, public) 
VALUES ('scans', 'scans', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the scans bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'scans');

-- Allow authenticated users to upload scans
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'scans' AND 
  auth.role() = 'authenticated'
);