import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // In dev without .env.local, we just warn — the app falls back to static data.
  if (typeof window !== "undefined") {
    console.warn(
      "[Ledger] Supabase env vars not set. Using static market data. " +
      "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable the live catalog."
    );
  }
}

export const supabase = url && key
  ? createClient(url, key)
  : null;
