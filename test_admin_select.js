const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function test() {
  const { data, error } = await supabaseAdmin
    .from("vault_holdings")
    .select(`
      id,
      symbol,
      name,
      set,
      grade,
      cert_number,
      acquisition_price,
      status,
      image_url,
      raw_image_url,
      profiles(name, email)
    `)
    .in("status", ["shipped", "pending_authentication"])
    .order("created_at", { ascending: false });
    
  console.log("Error:", error);
}

test();
