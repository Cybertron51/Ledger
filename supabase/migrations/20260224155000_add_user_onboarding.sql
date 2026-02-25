-- Add new columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS favorite_tcgs TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS primary_goal TEXT;

-- Add missing raw_image_url to vault_holdings
ALTER TABLE public.vault_holdings
ADD COLUMN IF NOT EXISTS raw_image_url TEXT;
