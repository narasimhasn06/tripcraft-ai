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

const emailA = envVars['TEST_USER_EMAIL'] || 'tctest@mailinator.com';
const password = envVars['TEST_USER_PASSWORD'];
const emailB = envVars['TEST_USER_B_EMAIL'] || 'tctestb@mailinator.com';
const passwordB = envVars['TEST_USER_B_PASSWORD'] || password;

const clientA = createClient(SUPABASE_URL, ANON_KEY);
const clientB = createClient(SUPABASE_URL, ANON_KEY);

console.log('Logging in User A:', emailA);
const { data: authA, error: authAErr } = await clientA.auth.signInWithPassword({ email: emailA, password });
if (authAErr) {
  console.error('User A login failed:', authAErr.message);
  process.exit(1);
}

console.log('Logging in User B:', emailB);
const { data: authB, error: authBErr } = await clientB.auth.signInWithPassword({ email: emailB, password: passwordB });
if (authBErr) {
  console.error('User B login failed:', authBErr.message);
  process.exit(1);
}

// 1. Create a trip shared with User B's email
console.log('User A creates a trip with traveler tag:', emailB);
const { data: trip, error: tripErr } = await clientA.from('trips').insert({
  user_id: authA.user.id,
  title: 'Shared RLS Test Trip',
  destination: 'Bali, Indonesia',
  start_date: '2026-10-04',
  end_date: '2026-10-07',
  traveller_count: 2,
  budget_level: 'moderate',
  travel_pace: 'balanced',
  interests: ['Family'],
  notes: `Initial notes\n\n[travelers]:# (Narasimha:${emailB})`,
  status: 'draft',
}).select('id, notes').single();

if (tripErr) {
  console.error('Failed to create trip:', tripErr.message);
  process.exit(1);
}
console.log('Trip created successfully. ID:', trip.id, 'Notes:', trip.notes);

// 2. Query as User B
console.log('Querying as User B...');
const { data: selectResult, error: selectErr } = await clientB
  .from('trips')
  .select('id, title, notes')
  .eq('id', trip.id)
  .maybeSingle();

if (selectErr) {
  console.error('User B query failed with error:', selectErr.message);
} else if (selectResult) {
  console.log('✅ SUCCESS: User B successfully fetched the shared trip! Title:', selectResult.title);
} else {
  console.log('❌ FAILED: User B query returned empty (0 rows).');
}

// Cleanup
console.log('Cleaning up test trip...');
await clientA.from('trips').delete().eq('id', trip.id);
console.log('Done.');
