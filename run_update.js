require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
async function run() {
  const { data: cards } = await supabase.from('cards').select('id, symbol').in('symbol', ['CHAR10-BASE-1999', 'LUG10-NEO-2000', 'BLS10-BASE-1999']);
  
  if (cards) {
      await supabase.from('prices')
        .update({ 
          price: 15000 * (1 + (Math.random() * 0.2 - 0.1)), 
          change_24h: Math.random() * 1000 - 500, 
          change_pct_24h: Math.random() * 10 - 5 
        })
        .eq('card_id', cards[Math.floor(Math.random() * cards.length)].id);
  }
}
setInterval(run, 1500);
