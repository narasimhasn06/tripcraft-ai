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

console.log('Logging in User:', email);
const { data, error } = await client.auth.signInWithPassword({ email, password });
if (error) {
  console.error('Login failed:', error.message);
  process.exit(1);
}

const token = data.session.access_token;
console.log('Access Token retrieved.');

// Decode JWT payload
const base64Url = token.split('.')[1];
const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');

console.log('Decoded JWT payload:');
console.log(JSON.stringify(JSON.parse(jsonPayload), null, 2));
