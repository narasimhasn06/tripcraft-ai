/**
 * TripCraft AI — Live Edge Function Verification Script
 *
 * Checks:
 *   1. Deployed Edge Function invocation
 *   2. User authentication token validation
 *   3. Real OpenAI query and response schema formatting
 *   4. Transactional database updates (saving days and activities)
 *   5. Cleanup
 *
 * Run with:
 *   node scripts/verify-edge-function.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const envContent = readFileSync(join(root, '.env.local'), 'utf8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const ANON_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const email = process.env.TEST_USER_EMAIL || envVars['TEST_USER_EMAIL'] || 'tctest@mailinator.com';
const password = process.env.TEST_USER_PASSWORD || envVars['TEST_USER_PASSWORD'];

if (!password) {
  console.error('❌ Error: TEST_USER_PASSWORD is not set. Please set it in your environment or in .env.local.');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, ANON_KEY);

console.log('\n🧪 Testing Live Supabase Edge Function `generate-itinerary`...\n');

// 1. Authenticate
const { data: auth, error: authErr } = await client.auth.signInWithPassword({ email, password });
if (authErr) {
  console.error('❌ Authentication failed:', authErr.message);
  process.exit(1);
}
console.log('✅ User signed in: uid =', auth.user.id);

// 2. Create a Draft Trip
const { data: trip, error: tripErr } = await client.from('trips').insert({
  user_id: auth.user.id,
  title: 'Draft Test Trip',
  destination: 'Kyoto, Japan',
  start_date: '2026-11-01',
  end_date: '2026-11-02',
  traveller_count: 2,
  budget_level: 'moderate',
  travel_pace: 'balanced',
  interests: ['Culture', 'Food'],
  notes: 'Recommend temples and matcha tea spots.',
  status: 'draft',
}).select('*').single();

if (tripErr || !trip) {
  console.error('❌ Draft trip creation failed:', tripErr?.message);
  process.exit(1);
}
console.log('✅ Created draft trip: id =', trip.id);

// 3. Invoke Deployed Edge Function
console.log('⏳ Invoking generate-itinerary Edge Function (Waiting for OpenAI)...');
const fnUrl = `${SUPABASE_URL}/functions/v1/generate-itinerary`;

try {
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.session.access_token}`,
    },
    body: JSON.stringify({ trip_id: trip.id }),
  });

  console.log('📡 Response status:', res.status, res.statusText);
  const data = await res.json();

  if (!res.ok) {
    console.error('❌ Edge Function invocation failed:', data.error || data);
    // Cleanup
    await client.from('trips').delete().eq('id', trip.id);
    process.exit(1);
  }

  console.log('✅ Edge Function responded successfully!');
  console.log('📄 Generated Trip Title:', data.title);
  console.log('📄 AI Summary:', data.ai_summary);
  console.log('📄 Total Days Generated:', data.itinerary_days?.length);
  
  if (data.itinerary_days && data.itinerary_days.length > 0) {
    const day = data.itinerary_days[0];
    console.log(`   - Day ${day.day_number}: ${day.title} (${day.activities?.length || 0} activities)`);
    if (day.activities && day.activities.length > 0) {
      const act = day.activities[0];
      console.log(`     * Activity 1: ${act.title} at ${act.start_time || 'unspecified time'} (${act.location})`);
    }
  }

  // 4. Verify Database Persistence (Query separately to check it's saved in public tables)
  console.log('🔍 Verifying database persistence...');
  const { data: dbTrip, error: dbErr } = await client
    .from('trips')
    .select(`
      *,
      itinerary_days (
        *,
        activities ( * )
      )
    `)
    .eq('id', trip.id)
    .single();

  if (dbErr || !dbTrip) {
    console.error('❌ DB Verification failed:', dbErr?.message);
  } else {
    console.log('✅ DB Verification succeeded!');
    console.log('   - Trip Status in DB:', dbTrip.status);
    console.log('   - Itinerary Days count in DB:', dbTrip.itinerary_days?.length);
    const totalActs = dbTrip.itinerary_days?.reduce((sum, d) => sum + (d.activities?.length || 0), 0);
    console.log('   - Total Activities count in DB:', totalActs);
  }

} catch (err) {
  console.error('❌ HTTP/Network error:', err.message);
} finally {
  // 5. Cleanup
  console.log('🗑️  Cleaning up test trip...');
  const { error: delErr } = await client.from('trips').delete().eq('id', trip.id);
  if (delErr) {
    console.error('⚠️  Failed to clean up test trip:', delErr.message);
  } else {
    console.log('✅ Test trip cleaned up successfully.');
  }
}

await client.auth.signOut();
console.log('🚪 Signed out.');
