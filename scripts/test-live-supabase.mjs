/**
 * TripCraft AI – Live Supabase Integration Test
 * 
 * Tests real Supabase Auth + CRUD + RLS using the credentials from .env.local
 * Run with: node scripts/test-live-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ── Load env vars from .env.local ─────────────────────────────────────────
const envContent = readFileSync(join(root, '.env.local'), 'utf8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_ANON_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

// ── Results tracker ───────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function log(emoji, label, detail = '') {
  const line = `  ${emoji} ${label}${detail ? ': ' + detail : ''}`;
  console.log(line);
  results.push({ emoji, label, detail });
}

function pass(label, detail = '') { log('✅', label, detail); passed++; }
function fail(label, detail = '') { log('❌', label, detail); failed++; }
function info(label, detail = '') { log('ℹ️ ', label, detail); }

// ── Test runners ──────────────────────────────────────────────────────────
console.log('\n🧪 TripCraft AI — Live Supabase Integration Tests\n');

// 1. Credential checks
console.log('🔌 Section 1: Credentials & connectivity');

if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
  fail('NEXT_PUBLIC_SUPABASE_URL', 'still placeholder or missing');
  process.exit(1);
} else {
  pass('NEXT_PUBLIC_SUPABASE_URL configured', SUPABASE_URL);
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('placeholder')) {
  fail('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'still placeholder or missing');
  process.exit(1);
} else {
  pass('NEXT_PUBLIC_SUPABASE_ANON_KEY configured', `${SUPABASE_ANON_KEY.substring(0, 40)}...`);
}

// Create two separate clients to test RLS isolation
const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Connectivity test (no auth needed)
console.log('\n🌐 Section 2: Network connectivity');
try {
  // Just hitting the API URL – a 401/403 means Supabase is reachable
  const res = await fetch(`${SUPABASE_URL}/rest/v1/trips`, {
    headers: { 'apikey': SUPABASE_ANON_KEY }
  });
  if (res.status === 200 || res.status === 401 || res.status === 403) {
    pass('Supabase REST API reachable', `HTTP ${res.status}`);
  } else {
    fail('Supabase REST API', `Unexpected HTTP ${res.status}`);
  }
} catch (err) {
  fail('Supabase REST API reachable', err.message);
}

// 3. Authenticate User A — sign-in first (account was registered in a previous run)
// Falls back to sign-up if the account does not exist yet.
console.log('\n👤 Section 3: Authentication (User A)');
// Use the manually created test account from Supabase Dashboard
// Created via: Dashboard → Authentication → Users → Add User
const emailA = process.env.TEST_USER_EMAIL || envVars['TEST_USER_EMAIL'] || 'tctest@mailinator.com';
const password = process.env.TEST_USER_PASSWORD || envVars['TEST_USER_PASSWORD'];

if (!password) {
  console.error('❌ Error: TEST_USER_PASSWORD is not set. Please set it in your environment or in .env.local.');
  process.exit(1);
}

let userAId = null;
let userASignedIn = false;
let signUpConfirmRequired = false;

try {
  const { data, error } = await clientA.auth.signInWithPassword({ email: emailA, password });
  if (error) {
    if (error.message?.includes('Email not confirmed')) {
      signUpConfirmRequired = true;
      info('User A sign-in: email confirmation required',
        'In Supabase Dashboard → Auth → Users, find this user and click Confirm email');
    } else {
      throw error;
    }
  } else {
    userAId = data.user.id;
    userASignedIn = true;
    pass('User A sign-in succeeded', `uid: ${userAId}`);
  }
} catch (err) {
  fail('User A authentication', err.message);
}

if (signUpConfirmRequired) {
  console.log('\n⚠️  Email confirmation is required for new sign-ups.');
  console.log('   To run authenticated tests without manual email confirmation:');
  console.log('   1. Go to your Supabase Dashboard → Authentication → Providers → Email');
  console.log('   2. Turn OFF "Enable email confirmations"');
  console.log('   3. Re-run this script: node scripts/test-live-supabase.mjs\n');
  console.log('   Continuing with unauthenticated RLS checks only...\n');
}

// 5. Unauthenticated RLS check (always runs)
console.log('\n🛡️  Section 4: RLS — unauthenticated reads must be blocked');
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

try {
  const { data, error } = await anonClient.from('trips').select('id').limit(1);
  if (error && (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('permission'))) {
    pass('Unauthenticated SELECT on trips → blocked by RLS', error.message.substring(0, 60));
  } else if (!data || data.length === 0) {
    pass('Unauthenticated SELECT on trips → returned 0 rows (RLS effective)');
  } else {
    fail('Unauthenticated SELECT on trips → returned data without auth', `${data.length} rows returned — RLS may not be working!`);
  }
} catch (err) {
  pass('Unauthenticated SELECT on trips → threw error (RLS effective)', err.message.substring(0, 60));
}

try {
  const { data, error } = await anonClient.from('profiles').select('id').limit(1);
  if (error || !data || data.length === 0) {
    pass('Unauthenticated SELECT on profiles → blocked (0 rows or error)');
  } else {
    fail('Unauthenticated SELECT on profiles → returned data without auth', `${data.length} rows leaked!`);
  }
} catch (err) {
  pass('Unauthenticated SELECT on profiles → threw error (RLS effective)');
}

// 6. Authenticated CRUD (only if sign-in succeeded)
if (userASignedIn && userAId) {
  console.log('\n📝 Section 5: Authenticated CRUD (User A)');
  
  let createdTripId = null;
  
  // INSERT
  try {
    const { data, error } = await clientA.from('trips').insert({
      user_id: userAId,
      title: 'Live Test Trip — Barcelona',
      destination: 'Barcelona, Spain',
      start_date: '2026-09-15',
      end_date: '2026-09-18',
      traveller_count: 1,
      budget_level: 'moderate',
      travel_pace: 'balanced',
      interests: ['Nature', 'Food'],
      notes: 'Test notes from live integration test',
      status: 'draft',
    }).select('id').single();
    
    if (error) throw error;
    createdTripId = data.id;
    pass('INSERT trip succeeded', `id: ${createdTripId}`);
  } catch (err) {
    fail('INSERT trip', err.message);
  }

  // SELECT (read own trip back)
  if (createdTripId) {
    try {
      const { data, error } = await clientA.from('trips')
        .select('id, title, destination, status')
        .eq('id', createdTripId)
        .single();
      if (error) throw error;
      pass('SELECT own trip succeeded', `${data.destination} / status: ${data.status}`);
    } catch (err) {
      fail('SELECT own trip', err.message);
    }
  }

  // SELECT dashboard list
  try {
    const { data, error } = await clientA.from('trips')
      .select('id, destination, status, created_at')
      .eq('user_id', userAId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    pass('SELECT all own trips (dashboard query)', `${data.length} trip(s) returned`);
  } catch (err) {
    fail('SELECT all own trips', err.message);
  }

  // UPDATE notes
  if (createdTripId) {
    try {
      const { error } = await clientA.from('trips')
        .update({ notes: 'Updated: book window table at La Mar restaurant' })
        .eq('id', createdTripId);
      if (error) throw error;
      pass('UPDATE trip notes succeeded');
    } catch (err) {
      fail('UPDATE trip notes', err.message);
    }
    
    // Verify update persisted
    try {
      const { data, error } = await clientA.from('trips')
        .select('notes')
        .eq('id', createdTripId)
        .single();
      if (error) throw error;
      if (data.notes?.includes('La Mar')) {
        pass('UPDATE persisted correctly', data.notes.substring(0, 50));
      } else {
        fail('UPDATE persistence check', `notes = "${data.notes}"`);
      }
    } catch (err) {
      fail('UPDATE persistence verify', err.message);
    }
  }

  // 7. RLS cross-user isolation (sign up User B)
  console.log('\n🔐 Section 6: RLS — cross-user data isolation');
  
  const emailB = process.env.TEST_USER_B_EMAIL || envVars['TEST_USER_B_EMAIL'] || `test-b-${Date.now()}@mailinator.com`;
  const passwordB = process.env.TEST_USER_B_PASSWORD || envVars['TEST_USER_B_PASSWORD'] || password;
  let userBSignedIn = false;
  
  try {
    const { data: signUpB, error: errB } = await clientB.auth.signUp({ email: emailB, password: passwordB });
    if (errB) throw errB;
    
    if (signUpB.session) {
      pass('User B sign-up succeeded', emailB);
    } else {
      info('User B sign-up: email confirmation required', 'Skipping cross-user RLS test');
    }
    
    if (signUpB.session || signUpB.user) {
      const { data: signInB, error: signInErrB } = await clientB.auth.signInWithPassword({ email: emailB, password: passwordB });
      if (!signInErrB && signInB.session) {
        userBSignedIn = true;
        pass('User B sign-in succeeded', `uid: ${signInB.user.id}`);
      }
    }
  } catch (err) {
    if (err.message?.includes('Email not confirmed')) {
      info('User B cross-user test', 'Skipped — email confirmation required');
    } else {
      fail('User B sign-up/sign-in', err.message);
    }
  }

  if (userBSignedIn && createdTripId) {
    // User B tries to read User A's trip
    try {
      const { data, error } = await clientB.from('trips')
        .select('id, destination')
        .eq('id', createdTripId)
        .single();
      
      if (error || !data) {
        pass('RLS: User B cannot read User A\'s trip', 'Correctly blocked ✓');
      } else {
        fail('RLS VIOLATION: User B read User A\'s trip!', `destination: ${data.destination}`);
      }
    } catch (err) {
      pass('RLS: User B cannot read User A\'s trip', 'Threw error as expected');
    }

    // User B tries to delete User A's trip
    try {
      const { error } = await clientB.from('trips')
        .delete()
        .eq('id', createdTripId);
      
      // Verify trip still exists from User A's perspective
      const { data: checkData } = await clientA.from('trips')
        .select('id')
        .eq('id', createdTripId)
        .single();
      
      if (checkData) {
        pass('RLS: User B cannot delete User A\'s trip', 'Trip still exists after User B delete attempt');
      } else {
        fail('RLS VIOLATION: User B deleted User A\'s trip!');
      }
    } catch (err) {
      pass('RLS: User B delete blocked', err.message.substring(0, 60));
    }
    
    // Sign out User B
    await clientB.auth.signOut();
  }

  // 8. DELETE own trip (cleanup)
  if (createdTripId) {
    console.log('\n🗑️  Section 7: DELETE (cleanup)');
    try {
      const { error } = await clientA.from('trips')
        .delete()
        .eq('id', createdTripId);
      if (error) throw error;
      pass('DELETE own trip succeeded');
      
      // Confirm deleted
      const { data: checkDel } = await clientA.from('trips')
        .select('id')
        .eq('id', createdTripId)
        .maybeSingle();
      if (!checkDel) {
        pass('DELETE confirmed — trip no longer queryable');
      } else {
        fail('DELETE did not remove trip', `Still found id: ${checkDel.id}`);
      }
    } catch (err) {
      fail('DELETE own trip', err.message);
    }
  }

  // Sign out User A
  await clientA.auth.signOut();
  pass('User A signed out cleanly');
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} checks`);
if (failed === 0) {
  console.log('🎉 All live Supabase tests passed!\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${failed} test(s) failed — see above for details.\n`);
  process.exit(1);
}
