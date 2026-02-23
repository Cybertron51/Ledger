-- Create a bucket named "scans" for user uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('scans', 'scans', true);

-- Allow public read access to the scans bucket
CREATE POLICY "Public Read Scans"
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'scans');

-- Allow authenticated users to upload to the bucket
CREATE POLICY "Users can upload scans"
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'scans');
