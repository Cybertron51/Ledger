-- Fix signup trigger to avoid blocking dashboard/admin user creation.
-- Referral enforcement is handled by app onboarding, not by raising in trigger.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code_id UUID;
  v_referral_code_text TEXT;
BEGIN
  -- Extract referral code from metadata (if present).
  v_referral_code_text := NEW.raw_user_meta_data->>'referral_code';

  IF v_referral_code_text IS NOT NULL THEN
    SELECT id INTO v_referral_code_id
    FROM public.referral_codes
    WHERE code = v_referral_code_text;
  END IF;

  INSERT INTO public.profiles (id, email, name, cash_balance, locked_balance, referral_code_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    0.00,
    0.00,
    v_referral_code_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    referral_code_id = COALESCE(EXCLUDED.referral_code_id, public.profiles.referral_code_id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Signup Failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
