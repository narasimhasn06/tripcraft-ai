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
const email = 'tctestb@mailinator.com';
const password = 'TripCraft2026!';

const client = createClient(SUPABASE_URL, ANON_KEY);

console.log('Signing up User B:', email);
const { data, error } = await client.auth.signUp({
  email,
  password,
});

if (error) {
  console.error('Sign up failed:', error.message);
} else {
  console.log('Sign up successful! Data:', data);
}
