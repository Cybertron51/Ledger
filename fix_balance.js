const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBalance() {
    const email = 'bob@tash.com';
    const adjustment = -2000; // Subtract the double-credited $2,000

    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, cash_balance')
        .eq('email', email)
        .single();

    if (fetchError || !profile) {
        console.error("Error fetching profile:", fetchError);
        return;
    }

    const newBalance = Number(profile.cash_balance) + adjustment;
    console.log(`Current Balance: ${profile.cash_balance}`);
    console.log(`Adjusting by: ${adjustment}`);
    console.log(`New target balance: ${newBalance}`);

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ cash_balance: newBalance })
        .eq('id', profile.id);

    if (updateError) {
        console.error("Error updating balance:", updateError);
    } else {
        console.log("Balance fixed successfully!");
    }
}

fixBalance();
