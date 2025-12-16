import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('handle');
  
  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('Users:', data);
  }
}

testConnection();