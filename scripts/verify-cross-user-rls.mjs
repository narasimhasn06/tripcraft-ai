/**
 * TripCraft AI — Cross-User RLS Verification Script
 *
 * Prerequisites:
 *   - User A (tctest@mailinator.com) must be confirmed (already done)
 *   - EITHER:
 *     a) Email confirmations must be disabled in Supabase Dashboard
 *        (Auth → Providers → Email → uncheck "Confirm email" → Save)
 *     b) User B must be pre-confirmed (manually created in Supabase Dashboard)
 *
 * Usage:
 *   node scripts/verify-cross-user-rls.mjs
 *   USERB_EMAIL=someemail@mailinator.com node scripts/verify-cross-user-rls.mjs
 *
 * Tests:
 *   - User B cannot SELECT User A's trips
 *   - User B cannot UPDATE User A's trips
 *   - User B cannot DELETE User A's trips
 *   - User B cannot SELECT User A's itinerary_days
 *   - User B cannot INSERT into User A's itinerary_days or activities
 *   - User B cannot SELECT User A's activities
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

let passed = 0;
let failed = 0;
const results = {
  rlsCrossSelect: null,
  rlsCrossUpdate: null,
  rlsCrossDelete: null,
  rlsItineraryDays: null,
  rlsActivities: null,
};

function pass(label, detail = '', cat = null) {
  console.log(`  ✅ ${label}${detail ? ': ' + detail : ''}`);
  passed++;
  if (cat) results[cat] = 'PASS';
}
function fail(label, detail = '', cat = null) {
  console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
  failed++;
  if (cat) results[cat] = 'FAIL';
}
function info(label, detail = '') {
  console.log(`  ℹ️  ${label}${detail ? ': ' + detail : ''}`);
}
function notTested(cat) {
  if (results[cat] === null) results[cat] = 'NOT_TESTED';
}

const fmt = (v) => v === 'PASS' ? '✅ PASS' : v === 'FAIL' ? '❌ FAIL' : '⬜ NOT TESTED';

const emailA = process.env.TEST_USER_EMAIL || envVars['TEST_USER_EMAIL'] || 'tctest@mailinator.com';
const password = process.env.TEST_USER_PASSWORD || envVars['TEST_USER_PASSWORD'];
const emailB = process.env.TEST_USER_B_EMAIL || envVars['TEST_USER_B_EMAIL'] || process.env.USERB_EMAIL || `tctestb-rls-${Date.now()}@mailinator.com`;
const passwordB = process.env.TEST_USER_B_PASSWORD || envVars['TEST_USER_B_PASSWORD'] || password;

if (!password) {
  console.error('❌ Error: TEST_USER_PASSWORD is not set. Please set it in your environment or in .env.local.');
  process.exit(1);
}

const clientA = createClient(SUPABASE_URL, ANON_KEY);
const clientB = createClient(SUPABASE_URL, ANON_KEY);

console.log('\n🔐 TripCraft AI — Cross-User RLS Verification\n');
console.log(`  User A: ${emailA}`);
console.log(`  User B: ${emailB}\n`);

// ── Authenticate User A ────────────────────────────────────────────────────
let userAId = null;
let createdTripId = null;
let createdDayId = null;
let createdActivityId = null;

console.log('👤 Step 1: Authenticate User A\n');
try {
  const { data, error } = await clientA.auth.signInWithPassword({ email: emailA, password });
  if (error) throw error;
  userAId = data.user.id;
  pass('User A signed in', `uid: ${userAId.substring(0, 8)}...`);
} catch (err) {
  fail('User A sign-in', err.message);
  process.exit(1);
}

// ── Create test data as User A ─────────────────────────────────────────────
console.log('\n📝 Step 2: Create test data as User A\n');
try {
  const { data, error } = await clientA.from('trips').insert({
    user_id: userAId,
    title: 'RLS Test Trip — Tokyo',
    destination: 'Tokyo, Japan',
    start_date: '2026-11-01',
    end_date: '2026-11-03',
    traveller_count: 1,
    budget_level: 'moderate',
    travel_pace: 'balanced',
    interests: ['Technology'],
    notes: 'RLS cross-user test data',
    status: 'draft',
  }).select('id').single();
  if (error) throw error;
  createdTripId = data.id;
  pass('User A created trip', `id: ${createdTripId.substring(0, 8)}...`);
} catch (err) {
  fail('User A INSERT trip', err.message);
  process.exit(1);
}

try {
  const { data, error } = await clientA.from('itinerary_days').insert({
    trip_id: createdTripId,
    day_number: 1,
    itinerary_date: '2026-11-01',
    title: 'Arrival in Tokyo',
  }).select('id').single();
  if (error) throw error;
  createdDayId = data.id;
  pass('User A created itinerary_day', `id: ${createdDayId.substring(0, 8)}...`);
} catch (err) {
  fail('User A INSERT itinerary_day', err.message);
}

if (createdDayId) {
  try {
    const { data, error } = await clientA.from('activities').insert({
      itinerary_day_id: createdDayId,
      sort_order: 1,
      title: 'Shibuya Crossing',
      category: 'Culture',
    }).select('id').single();
    if (error) throw error;
    createdActivityId = data.id;
    pass('User A created activity', `id: ${createdActivityId.substring(0, 8)}...`);
  } catch (err) {
    fail('User A INSERT activity', err.message);
  }
}

// ── Authenticate User B ────────────────────────────────────────────────────
console.log('\n👤 Step 3: Authenticate User B\n');
let userBId = null;
let userBSignedIn = false;

try {
  // Try sign-in first
  const { data: signInData, error: signInErr } = await clientB.auth.signInWithPassword({ email: emailB, password: passwordB });
  
  if (!signInErr && signInData.user) {
    userBId = signInData.user.id;
    userBSignedIn = true;
    pass('User B signed in', `uid: ${userBId.substring(0, 8)}...`);
  } else {
    // Try sign-up (only works if email confirmations are disabled)
    info('Attempting User B sign-up (requires email confirmations disabled)');
    const { data: signUpData, error: signUpErr } = await clientB.auth.signUp({ email: emailB, password: passwordB });
    
    if (signUpErr) {
      if (signUpErr.message.includes('rate limit') || signUpErr.message.includes('Rate limit')) {
        fail('User B sign-up rate limited — wait a few minutes and retry', signUpErr.message);
      } else {
        fail('User B sign-up', signUpErr.message);
      }
    } else if (signUpData.session) {
      userBId = signUpData.user.id;
      userBSignedIn = true;
      pass('User B signed up + session obtained', `uid: ${userBId.substring(0, 8)}...`);
    } else {
      info('User B requires email confirmation',
        'Disable email confirmations: Supabase Dashboard → Auth → Providers → Email → uncheck "Confirm email" → Save → re-run');
      ['rlsCrossSelect', 'rlsCrossUpdate', 'rlsCrossDelete', 'rlsItineraryDays', 'rlsActivities'].forEach(notTested);
    }
  }
} catch (err) {
  fail('User B authentication', err.message);
  ['rlsCrossSelect', 'rlsCrossUpdate', 'rlsCrossDelete', 'rlsItineraryDays', 'rlsActivities'].forEach(notTested);
}

// ── Cross-user RLS tests ───────────────────────────────────────────────────
if (userBSignedIn && createdTripId) {
  console.log('\n🛡️  Step 4: Cross-User RLS Tests\n');

  // SELECT
  try {
    const { data, error } = await clientB.from('trips')
      .select('id, destination')
      .eq('id', createdTripId)
      .maybeSingle();
    if (!data) {
      pass('User B SELECT User A\'s trip → blocked (0 rows)', '', 'rlsCrossSelect');
    } else {
      fail('RLS VIOLATION: User B can SELECT User A\'s trip', `destination: ${data.destination}`, 'rlsCrossSelect');
    }
  } catch (err) {
    pass('User B SELECT User A\'s trip → threw error (blocked)', err.message.substring(0, 60), 'rlsCrossSelect');
  }

  // UPDATE
  try {
    const { error } = await clientB.from('trips')
      .update({ notes: 'HACKED' })
      .eq('id', createdTripId);

    const { data: check } = await clientA.from('trips')
      .select('notes')
      .eq('id', createdTripId)
      .single();

    if (check?.notes?.includes('RLS cross-user test data')) {
      pass('User B UPDATE User A\'s trip → blocked (notes unchanged)', '', 'rlsCrossUpdate');
    } else if (!check) {
      pass('User B UPDATE → trip not queryable by User A after attempt (blocked)', '', 'rlsCrossUpdate');
    } else {
      fail('RLS VIOLATION: User B UPDATE changed notes', `notes: ${check?.notes}`, 'rlsCrossUpdate');
    }
  } catch (err) {
    pass('User B UPDATE User A\'s trip → threw error (blocked)', err.message.substring(0, 60), 'rlsCrossUpdate');
  }

  // DELETE
  try {
    await clientB.from('trips').delete().eq('id', createdTripId);
    const { data: check } = await clientA.from('trips')
      .select('id')
      .eq('id', createdTripId)
      .maybeSingle();
    if (check) {
      pass('User B DELETE User A\'s trip → blocked (trip still exists)', '', 'rlsCrossDelete');
    } else {
      fail('RLS VIOLATION: User B deleted User A\'s trip!', '', 'rlsCrossDelete');
      createdTripId = null;
    }
  } catch (err) {
    pass('User B DELETE User A\'s trip → threw error (blocked)', err.message.substring(0, 60), 'rlsCrossDelete');
  }

  // itinerary_days
  if (createdDayId) {
    try {
      const { data } = await clientB.from('itinerary_days')
        .select('id')
        .eq('id', createdDayId)
        .maybeSingle();
      if (!data) {
        pass('User B SELECT itinerary_days → blocked', '', 'rlsItineraryDays');
      } else {
        fail('RLS VIOLATION: User B can SELECT itinerary_days', '', 'rlsItineraryDays');
      }
    } catch (err) {
      pass('User B SELECT itinerary_days → threw error', err.message.substring(0, 60), 'rlsItineraryDays');
    }

    // User B INSERT into User A's trip (should fail)
    if (createdTripId) {
      try {
        const { data, error } = await clientB.from('itinerary_days').insert({
          trip_id: createdTripId,
          day_number: 99,
          title: 'INJECTED',
        }).select('id').maybeSingle();
        if (!data) {
          pass('User B INSERT itinerary_day → blocked');
        } else {
          fail('RLS VIOLATION: User B inserted itinerary_day!');
          await clientA.from('itinerary_days').delete().eq('id', data.id);
        }
      } catch (err) {
        pass('User B INSERT itinerary_day → threw error (blocked)');
      }
    }
  } else {
    notTested('rlsItineraryDays');
  }

  // activities
  if (createdActivityId) {
    try {
      const { data } = await clientB.from('activities')
        .select('id')
        .eq('id', createdActivityId)
        .maybeSingle();
      if (!data) {
        pass('User B SELECT activities → blocked', '', 'rlsActivities');
      } else {
        fail('RLS VIOLATION: User B can SELECT activities', '', 'rlsActivities');
      }
    } catch (err) {
      pass('User B SELECT activities → threw error', err.message.substring(0, 60), 'rlsActivities');
    }

    if (createdDayId) {
      try {
        const { data, error } = await clientB.from('activities').insert({
          itinerary_day_id: createdDayId,
          sort_order: 99,
          title: 'INJECTED ACTIVITY',
        }).select('id').maybeSingle();
        if (!data) {
          pass('User B INSERT activity → blocked');
        } else {
          fail('RLS VIOLATION: User B inserted activity!');
          await clientA.from('activities').delete().eq('id', data.id);
        }
      } catch (err) {
        pass('User B INSERT activity → threw error (blocked)');
      }
    }
  } else {
    notTested('rlsActivities');
  }

  await clientB.auth.signOut();
  info('User B signed out');
} else if (!userBSignedIn) {
  ['rlsCrossSelect', 'rlsCrossUpdate', 'rlsCrossDelete', 'rlsItineraryDays', 'rlsActivities'].forEach(notTested);
}

// ── Cleanup ────────────────────────────────────────────────────────────────
if (createdTripId) {
  console.log('\n🗑️  Cleanup: Deleting User A\'s test data\n');
  try {
    await clientA.from('trips').delete().eq('id', createdTripId);
    pass('Test data cleaned up');
  } catch (err) {
    fail('Cleanup', err.message);
  }
}

await clientA.auth.signOut();
info('User A signed out');

// ── Final report ───────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(66)}`);
console.log(`📊 Cross-User RLS: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(66)}\n`);
console.log(`RLS — cross-user SELECT:       ${fmt(results.rlsCrossSelect)}`);
console.log(`RLS — cross-user UPDATE:       ${fmt(results.rlsCrossUpdate)}`);
console.log(`RLS — cross-user DELETE:       ${fmt(results.rlsCrossDelete)}`);
console.log(`itinerary_days ownership RLS:  ${fmt(results.rlsItineraryDays)}`);
console.log(`activities ownership RLS:      ${fmt(results.rlsActivities)}`);
console.log('');

if (failed === 0 && Object.values(results).some(v => v === 'PASS')) {
  console.log('🎉 All cross-user RLS tests passed!\n');
  process.exit(0);
} else if (Object.values(results).every(v => v === 'NOT_TESTED')) {
  console.log('⚠️  No cross-user tests could run — User B authentication required.\n');
  console.log('Fix: Supabase Dashboard → Authentication → Providers → Email → uncheck "Confirm email" → Save\n');
  process.exit(2);
} else if (failed > 0) {
  console.log(`⚠️  ${failed} RLS test(s) FAILED — security issue detected!\n`);
  process.exit(1);
} else {
  process.exit(0);
}
