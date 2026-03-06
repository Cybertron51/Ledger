-- Rename onboarding_complete to stripe_onboarding_complete
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='onboarding_complete') THEN
    ALTER TABLE profiles RENAME COLUMN onboarding_complete TO stripe_onboarding_complete;
  END IF;
END $$;
