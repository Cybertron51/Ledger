const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS stripe_transactions (
      id           TEXT        PRIMARY KEY,
      user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      amount       DECIMAL(14,2) NOT NULL,
      type         TEXT        NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `;

    console.log("------------------------------------------------------------");
    console.log("ACTION REQUIRED: IDEMPOTENCY TABLE SETUP");
    console.log("------------------------------------------------------------");
    console.log("Please run the following SQL in your Supabase SQL Editor:");
    console.log("");
    console.log(sql);
    console.log("------------------------------------------------------------");
}

createTable();
