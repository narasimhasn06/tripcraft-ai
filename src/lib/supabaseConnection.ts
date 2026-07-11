/**
 * Supabase Connection Check Utility
 *
 * Returns true ONLY when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * are set to real, non-placeholder values.
 *
 * When this returns false the application falls back to a localStorage sandbox
 * that is EXPLICITLY labelled as a development fallback in every UI surface.
 * This function must NEVER silently allow production code to run against real
 * Supabase with invalid credentials.
 */

const PLACEHOLDER_URL_FRAGMENTS = [
  'placeholder-project',
  'placeholder-url',
  'your_supabase_project_url',
  'your-project-id',
  'example.supabase.co',
];

const PLACEHOLDER_KEY_FRAGMENTS = [
  'placeholder-anon-key',
  'placeholder-key',
  'your_supabase_anon_key',
  'your-anon-key',
];

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1. Must be present
  if (!url || !key) return false;

  // 2. URL must not contain any known placeholder fragment
  for (const fragment of PLACEHOLDER_URL_FRAGMENTS) {
    if (url.includes(fragment)) return false;
  }

  // 3. Key must not contain any known placeholder fragment
  for (const fragment of PLACEHOLDER_KEY_FRAGMENTS) {
    if (key.includes(fragment)) return false;
  }

  // 4. URL must be syntactically valid http/https
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Throws a descriptive error in production when Supabase is not configured.
 * Call this at the top of server-side operations that require a real database.
 */
export function requireSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      '[TripCraft AI] Supabase is not configured. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local ' +
      'to valid non-placeholder values and restart the dev server.'
    );
  }
}
