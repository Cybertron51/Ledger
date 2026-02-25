-- Add onboarding fields to profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS favorite_tcgs TEXT[],
ADD COLUMN IF NOT EXISTS primary_goal TEXT;

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
