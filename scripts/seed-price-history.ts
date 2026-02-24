import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase admin credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Seeding Price History for up to 90 days...");

  await supabase.from('price_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { data: cards, error } = await supabase.from('cards').select('id, symbol');
  if (error || !cards) {
    console.error("Error fetching cards:", error);
    process.exit(1);
  }

  const { data: currentPrices, error: priceErr } = await supabase.from('prices').select('card_id, price');
  if (priceErr || !currentPrices) {
    console.error("Error fetching prices:", priceErr);
    process.exit(1);
  }

  const priceMap = new Map(currentPrices.map(p => [p.card_id, p.price]));

  const daysToSeed = 90;
  const dataToInsert = [];

  for (const card of cards) {
    let currentPrice = priceMap.get(card.id) || 1000;
    
    for (let day = 0; day < daysToSeed; day++) {
       const pctChange = (Math.random() * 0.1 - 0.05);
       const simulatedPrice = Math.max(10, currentPrice * (1 - pctChange));
       
       dataToInsert.push({
         card_id: card.id,
         price: Number(simulatedPrice.toFixed(2)),
         recorded_at: new Date(Date.now() - (day * 24 * 60 * 60 * 1000)).toISOString()
       });

       currentPrice = simulatedPrice;
    }
  }

  console.log(`Inserting ${dataToInsert.length} data points...`);
  
  const chunkSize = 500;
  for (let i = 0; i < dataToInsert.length; i += chunkSize) {
    const chunk = dataToInsert.slice(i, i + chunkSize);
    const { error: insErr } = await supabase.from('price_history').insert(chunk);
    if (insErr) {
       console.error("Failed to insert chunk:", insErr);
    }
  }

  console.log("Done seeding price history!");
}

main();
