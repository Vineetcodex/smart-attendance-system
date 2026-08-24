import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

console.log('Testing Supabase Connection...');
console.log('URL:', config.supabaseUrl);

const supabase = createClient(config.supabaseUrl, config.supabaseSecretKey);

async function testConn() {
  try {
    const { data, error } = await supabase.from('organizations').select('*').limit(1);
    if (error) {
      console.log('Query result error (expected if table not created yet):', error.message, error.code);
    } else {
      console.log('Query success! Data:', data);
    }
  } catch (err: any) {
    console.error('Connection exception:', err);
  }
}

testConn();
