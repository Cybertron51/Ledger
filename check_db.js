const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBalance() {
    const { data, error } = await supabase
        .from('profiles')
        .select('email, cash_balance, username')
        .eq('email', 'bob@tash.com')
        .single();

    if (error) {
        console.error("Error fetching profile:", error);
    } else {
        console.log("Profile found:", data);
    }
}

checkBalance();
