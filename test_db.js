import('dotenv').then(dotenv => {
  dotenv.config();
  import('@supabase/supabase-js').then(({ createClient }) => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    
    supabase.from('price_history').select('card_id, price, recorded_at').limit(10).then(res => {
      console.table(res.data);
    });
  });
});
