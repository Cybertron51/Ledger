-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Grant admin rights to the founder
UPDATE profiles SET is_admin = TRUE WHERE email = 'derekyp9@gmail.com';
