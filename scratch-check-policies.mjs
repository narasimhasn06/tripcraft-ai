import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '.env.local'), 'utf8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const ANON_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const email = envVars['TEST_USER_EMAIL'];
const password = envVars['TEST_USER_PASSWORD'];

const client = createClient(SUPABASE_URL, ANON_KEY);

console.log('Logging in...');
const { data: auth, error: authErr } = await client.auth.signInWithPassword({ email, password });
if (authErr) {
  console.error('Login failed:', authErr.message);
  process.exit(1);
}

console.log('Counting trips...');
const { count, error } = await client
  .from('trips')
  .select('*', { count: 'exact', head: true });

if (error) {
  console.error('Failed to query trips:', error.message);
} else {
  console.log(`Verification: Number of trips in database = ${count}`);
}
