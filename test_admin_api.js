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
      status,
      profiles(name, email)
    `)
        .in("status", ["shipped", "pending_authentication"])
        .order("created_at", { ascending: false });

    console.log("Error:", error);
    console.log("Data length:", data ? data.length : 0);
    if (data && data.length > 0) console.log(JSON.stringify(data[0], null, 2));
}

test();
