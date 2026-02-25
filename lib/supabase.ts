/**
 * TASH — Supabase Browser Client (Auth Only)
 *
 * This client uses the ANON KEY and is exposed to the browser.
 * It is used ONLY for authentication (signIn, signOut, session management).
 *
 * ALL database operations go through API routes using the service role key.
 * Do NOT use this client for .from() queries.
 *
 * The anon key is intentionally public — Supabase Auth requires it
 * to manage browser sessions. RLS policies ensure the anon key
 * has zero database access.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  if (typeof window !== "undefined") {
    console.warn(
      "[tash] Supabase auth env vars not set. Auth will be disabled."
    );
  }
}

export const supabase = url && key
  ? createClient(url, key)
  : null;
