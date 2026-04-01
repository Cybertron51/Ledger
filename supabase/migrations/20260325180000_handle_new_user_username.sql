-- Ensure profiles.username is never NULL on signup (admin API + metadata).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code_id UUID;
  v_referral_code_text TEXT;
  v_username TEXT;
BEGIN
  v_referral_code_text := NEW.raw_user_meta_data->>'referral_code';

  IF v_referral_code_text IS NOT NULL THEN
    SELECT id INTO v_referral_code_id FROM public.referral_codes WHERE code = v_referral_code_text;
  END IF;

  v_username := NULLIF(trim(NEW.raw_user_meta_data->>'username'), '');
  IF v_username IS NULL THEN
    v_username :=
      regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g')
      || '_'
      || substring(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  INSERT INTO public.profiles (id, email, name, username, cash_balance, locked_balance, referral_code_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_username,
    0.00,
    0.00,
    v_referral_code_id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    referral_code_id = COALESCE(EXCLUDED.referral_code_id, public.profiles.referral_code_id),
    username = COALESCE(NULLIF(trim(EXCLUDED.username), ''), public.profiles.username);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
