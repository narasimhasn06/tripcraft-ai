/**
 * TripCraft AI - Schema Alignment & Validation Tests
 * Tests:
 *   1. Form validation logic (date rules, 7-day limit, interests, options)
 *   2. Schema alignment (no JSONB itinerary in insert payloads)
 *   3. Type compliance (TripRow shape)
 *   4. Supabase connection check logic
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`         ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? 'Assertion failed');
}

// ---------------------------------------------------------------------------
// Section 1: Form validation logic (replicated from trips/new/page.tsx)
// ---------------------------------------------------------------------------
function validateTrip({ destination, startDate, endDate, travellerCount, selectedInterests }) {
  const errors = [];
  if (!destination || !startDate || !endDate || travellerCount < 1 || selectedInterests.length === 0) {
    errors.push('required');
    return errors;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) { errors.push('start>end'); return errors; }
  const today = new Date(); today.setHours(0,0,0,0);
  if (end < today) { errors.push('past'); return errors; }
  const dayCount = Math.ceil(Math.abs(end - start) / 86400000) + 1;
  if (dayCount > 7) { errors.push('7days'); return errors; }
  if (travellerCount < 1 || travellerCount > 20) { errors.push('travellers'); return errors; }
  return errors;
}

const future = (n) => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().split('T')[0]; };
const past = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; };

console.log('\n🧪 TripCraft AI - Full Test Suite\n');

console.log('📋 Section 1: Form validation');
test('All required → valid', () => assert(validateTrip({destination:'Paris',startDate:future(5),endDate:future(7),travellerCount:1,selectedInterests:['Culture']}).length === 0));
test('Empty destination → error', () => assert(validateTrip({destination:'',startDate:future(5),endDate:future(7),travellerCount:1,selectedInterests:['Culture']}).length > 0));
test('No interests → error', () => assert(validateTrip({destination:'Paris',startDate:future(5),endDate:future(7),travellerCount:1,selectedInterests:[]}).length > 0));
test('End before start → error', () => assert(validateTrip({destination:'Rome',startDate:future(10),endDate:future(5),travellerCount:1,selectedInterests:['Food']}).includes('start>end')));
test('Past end date → error', () => assert(validateTrip({destination:'Rome',startDate:past(10),endDate:past(3),travellerCount:1,selectedInterests:['Food']}).includes('past')));
test('Exactly 7 days → valid', () => assert(validateTrip({destination:'Tokyo',startDate:future(30),endDate:future(36),travellerCount:2,selectedInterests:['Nature']}).length === 0));
test('8 days → error', () => assert(validateTrip({destination:'Tokyo',startDate:future(30),endDate:future(37),travellerCount:2,selectedInterests:['Nature']}).includes('7days')));
test('10 days → error', () => assert(validateTrip({destination:'Paris',startDate:future(10),endDate:future(19),travellerCount:1,selectedInterests:['Shopping']}).includes('7days')));
test('1 day → valid', () => { const d=future(10); assert(validateTrip({destination:'London',startDate:d,endDate:d,travellerCount:1,selectedInterests:['Culture']}).length===0); });
test('0 travellers → error', () => assert(validateTrip({destination:'Berlin',startDate:future(5),endDate:future(7),travellerCount:0,selectedInterests:['Nightlife']}).length > 0));
test('20 travellers → valid', () => assert(validateTrip({destination:'Berlin',startDate:future(5),endDate:future(7),travellerCount:20,selectedInterests:['Family']}).length === 0));
test('21 travellers → error', () => assert(validateTrip({destination:'Berlin',startDate:future(5),endDate:future(7),travellerCount:21,selectedInterests:['Adventure']}).includes('travellers')));

// ---------------------------------------------------------------------------
// Section 2: Interest options (all 8 required)
// ---------------------------------------------------------------------------
console.log('\n🎯 Section 2: Interest options');
const REQUIRED_INTERESTS = ['Culture','Food','Nature','Adventure','Shopping','Nightlife','Family','Relaxation'];
const newFormSrc = readFileSync(join(root, 'src/app/trips/new/page.tsx'), 'utf8');
REQUIRED_INTERESTS.forEach(i => test(`Interest chip "${i}" present in form`, () => assert(newFormSrc.includes(`'${i}'`), `"${i}" not found in trips/new/page.tsx`)));
test('All 8 interests defined', () => assert((newFormSrc.match(/id: '/g) || []).length >= 8));

// ---------------------------------------------------------------------------
// Section 3: Budget / Pace options
// ---------------------------------------------------------------------------
console.log('\n💰 Section 3: Budget and Pace options');
['budget','moderate','premium'].forEach(v => test(`Budget option "${v}"`, () => assert(newFormSrc.includes(`value: '${v}'`), `"${v}" missing`)));
['relaxed','balanced','packed'].forEach(v => test(`Pace option "${v}"`, () => assert(newFormSrc.includes(`value: '${v}'`), `"${v}" missing`)));

// ---------------------------------------------------------------------------
// Section 4: Schema alignment — JSONB itinerary NOT in frontend inserts
// ---------------------------------------------------------------------------
console.log('\n🏗️  Section 4: Schema alignment (no JSONB writes from frontend)');

test('trips/new: no "itinerary:" in Supabase insert', () => {
  // Find the .insert({ ... }) block and confirm itinerary is not a key
  const insertMatch = newFormSrc.match(/\.insert\(\{([^}]+)\}/s);
  if (!insertMatch) throw new Error('Could not find .insert() call in trips/new/page.tsx');
  const insertBlock = insertMatch[1];
  assert(!insertBlock.includes('itinerary:'), `"itinerary:" found inside .insert() block — should not be written by frontend`);
});

test('trips/new: no generateMockItinerary import', () => {
  assert(!newFormSrc.includes('generateMockItinerary'), 'generateMockItinerary should not be imported in trips/new/page.tsx');
});

const detailSrc = readFileSync(join(root, 'src/app/trips/[id]/page.tsx'), 'utf8');

test('trips/[id]: no "itinerary:" in .update() call', () => {
  const updateMatch = detailSrc.match(/\.update\(\{([^}]+)\}/s);
  if (!updateMatch) {
    // Could be multiple update calls; check none have itinerary
    assert(!detailSrc.includes("update({ itinerary"), 'itinerary JSONB write found in trips/[id]/page.tsx update call');
    return;
  }
  assert(!updateMatch[1].includes('itinerary:'), 'itinerary found in .update() block');
});

test('trips/[id]: uses itinerary_days (relational fetch)', () => {
  assert(detailSrc.includes('itinerary_days'), 'trips/[id]/page.tsx does not reference itinerary_days table');
});

test('trips/[id]: uses activities relational select', () => {
  assert(detailSrc.includes('activities ( *'), 'trips/[id]/page.tsx does not fetch activities relationally');
});

test('trips/[id]: no trip.itinerary.days references', () => {
  assert(!detailSrc.includes('trip.itinerary.days'), 'Found trip.itinerary.days reference — page must use relational data');
});

// ---------------------------------------------------------------------------
// Section 5: Types alignment
// ---------------------------------------------------------------------------
console.log('\n📐 Section 5: Types file alignment');
const typesSrc = readFileSync(join(root, 'src/lib/types.ts'), 'utf8');

test('TripRow interface exists', () => assert(typesSrc.includes('export interface TripRow'), 'TripRow not exported from types.ts'));
test('ItineraryDayRow interface exists', () => assert(typesSrc.includes('export interface ItineraryDayRow'), 'ItineraryDayRow missing'));
test('ActivityRow interface exists', () => assert(typesSrc.includes('export interface ActivityRow'), 'ActivityRow missing'));
test('TripWithItinerary composite type exists', () => assert(typesSrc.includes('TripWithItinerary'), 'TripWithItinerary missing'));
test('itinerary JSONB field NOT in TripRow', () => {
  const tripRowBlock = typesSrc.match(/interface TripRow \{([^}]+)\}/s)?.[1] ?? '';
  assert(!tripRowBlock.includes('itinerary:'), 'itinerary JSONB field should not be in TripRow');
});

// ---------------------------------------------------------------------------
// Section 6: Supabase connection checker
// ---------------------------------------------------------------------------
console.log('\n🔌 Section 6: Supabase connection checker source');
const connSrc = readFileSync(join(root, 'src/lib/supabaseConnection.ts'), 'utf8');
const PLACEHOLDER_CHECKS = ['placeholder-project','placeholder-anon-key','your_supabase_project_url','your_supabase_anon_key'];
PLACEHOLDER_CHECKS.forEach(p => test(`Placeholder "${p}" is blocked`, () => assert(connSrc.includes(p), `"${p}" not listed in placeholder check`)));
test('requireSupabaseConfigured() is exported', () => assert(connSrc.includes('export function requireSupabaseConfigured'), 'requireSupabaseConfigured not exported'));

// ---------------------------------------------------------------------------
// Section 7: RLS verification (static check only — migration source)
// ---------------------------------------------------------------------------
console.log('\n🛡️  Section 7: RLS policies in migration');
const migSrc = readFileSync(join(root, 'supabase/migrations/20260710172600_tripcraft_mvp.sql'), 'utf8');
const TABLES = ['profiles', 'trips', 'itinerary_days', 'activities'];
TABLES.forEach(t => test(`RLS enabled on "${t}"`, () => assert(migSrc.includes(`alter table ${t} enable row level security`), `RLS not enabled on ${t}`)));
['select','insert','update','delete'].forEach(op => {
  test(`trips RLS policy for ${op}`, () => assert(migSrc.includes(`on trips for ${op}`), `No ${op} policy on trips`));
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(55)}`);
console.log(`📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed === 0) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. See output above.\n');
  process.exit(1);
}
