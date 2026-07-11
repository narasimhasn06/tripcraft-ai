/**
 * User B signup script - registers User B and polls mailinator for confirmation
 * Run: node scripts/signup-userb.mjs
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

const timestamp = Date.now();
const inboxName = `tctestb${timestamp}`;
const emailB = `${inboxName}@mailinator.com`;
const password = process.env.TEST_USER_B_PASSWORD || envVars['TEST_USER_B_PASSWORD'] || process.env.TEST_USER_PASSWORD || envVars['TEST_USER_PASSWORD'];

if (!password) {
  console.error('❌ Error: TEST_USER_B_PASSWORD or TEST_USER_PASSWORD is not set. Please set it in your environment or in .env.local.');
  process.exit(1);
}

console.log('User B email:', emailB);
console.log('Mailinator inbox name:', inboxName);

const clientB = createClient(SUPABASE_URL, ANON_KEY);

const { data: signUpData, error: signUpErr } = await clientB.auth.signUp({ email: emailB, password });
if (signUpErr) {
  console.error('SignUp error:', signUpErr.message);
  process.exit(1);
}

if (signUpData.session) {
  console.log('USER_B_SESSION_OBTAINED uid=' + signUpData.user.id);
  console.log('No email confirmation needed - update verify script directly');
  await clientB.auth.signOut();
} else if (signUpData.user) {
  console.log('EMAIL_CONFIRMATION_REQUIRED for uid=' + signUpData.user.id);
  console.log('Polling mailinator for confirmation link...');
  
  // Poll mailinator public JSON API
  const mailinatorUrl = `https://api.mailinator.com/api/v2/domains/public/inboxes/${inboxName}`;
  
  let attempts = 0;
  let found = false;
  
  while (attempts < 10 && !found) {
    await new Promise(r => setTimeout(r, 3000));
    attempts++;
    
    try {
      const res = await fetch(mailinatorUrl);
      if (res.status === 200) {
        const data = await res.json();
        if (data.msgs && data.msgs.length > 0) {
          console.log('Email found! Getting message content...');
          const msgId = data.msgs[0].id;
          const msgUrl = `https://api.mailinator.com/api/v2/domains/public/inboxes/${inboxName}/messages/${msgId}`;
          const msgRes = await fetch(msgUrl);
          if (msgRes.status === 200) {
            const msgData = await msgRes.json();
            const body = msgData.parts?.[0]?.body || JSON.stringify(msgData);
            const match = body.match(/https:\/\/zegmjpyxpgtwtizxfjbk\.supabase\.co\/auth\/v1\/verify\?[^\s"'<>]+/);
            if (match) {
              console.log('VERIFICATION_LINK_FOUND');
              console.log('LINK:', match[0]);
              found = true;
            } else {
              console.log('Email body found but no Supabase link (attempt', attempts, ')');
            }
          }
        } else {
          console.log('No emails yet (attempt', attempts, ')...');
        }
      } else if (res.status === 401) {
        console.log('Mailinator API requires auth - cannot poll automatically');
        break;
      } else {
        console.log('Mailinator API status:', res.status, '(attempt', attempts, ')');
      }
    } catch (err) {
      console.log('Poll error:', err.message.substring(0, 80));
    }
  }
  
  if (!found) {
    console.log('Could not auto-confirm. Manual steps:');
    console.log('1. Go to https://www.mailinator.com/v4/public/inboxes.jsp?to=' + inboxName);
    console.log('2. Click the Supabase confirmation email');
    console.log('3. Click the confirmation link');
    console.log('4. Then run: USERB_EMAIL=' + emailB + ' node scripts/verify-cross-user-rls.mjs');
  }
}
