# TripCraft AI &mdash; Smart Travel Itinerary Planner

TripCraft AI is a premium, AI-powered travel planner that eliminates the logistical overhead of trip planning. Users can describe their vacation ideas, select travel pacing and budget parameters, and receive custom, day-by-day travel itineraries. The application allows users to edit itineraries, modify activity times, locations, descriptions, and costs, saving changes securely.

---

## 🏗️ Architecture

TripCraft AI is built on a modern, decoupled relational stack:

1. **Frontend**: Next.js App Router (React 19) styled with Tailwind CSS (v4) and Lucide Icons. Designed with glassmorphism, responsive cards, and dynamic theme colors.
2. **Database (Supabase)**: PostgreSQL database hosted on Supabase, structured in relational tables:
   * `profiles`: Authenticated users.
   * `trips`: Trip records containing destination, date limits, traveller configurations, and status.
   * `itinerary_days`: Individual days linked to a parent trip.
   * `activities`: Individual events linked to a parent day.
3. **AI Generation (Supabase Edge Functions)**: A Deno Edge Function (`generate-itinerary`) invoked securely by Next.js clients. It coordinates with OpenAI's Chat Completion APIs (utilizing structured JSON formats) and persists the generated nodes directly to PostgreSQL via an atomic transaction.
4. **Security & Row-Level Security (RLS)**: Row-Level Security is fully active on all PostgreSQL tables. Unauthenticated SELECTs are blocked, and cross-user modifications are protected by checking ownership matches: `user_id = auth.uid()` or nested foreign keys matching the user profile.

---

## 🛠️ Local Setup

Follow these steps to run the Next.js app locally:

1. **Clone & Install Dependencies**:
   ```bash
   git clone <repository-url>
   cd TripCraft-AI
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the Supabase details (described in the Environment Variables section below).

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🗄️ Supabase Migration Setup

To configure the database schema and security policies in a new Supabase project:

1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Copy the contents of the database migration file:
   * [20260711120000_save_itinerary_rpc.sql](file:///d:/learning/AI/AG/TripCraft-AI/supabase/migrations/20260711120000_save_itinerary_rpc.sql)
3. Run the SQL code to:
   * Create tables (`profiles`, `trips`, `itinerary_days`, `activities`).
   * Configure foreign key constraints and cascading deletes.
   * Enable Row-Level Security (RLS) policies on all tables.
   * Define the `save_generated_itinerary` RPC function (which handles atomic multi-row updates securely).

---

## 🔑 Authentication Setup

TripCraft AI uses Supabase Auth for identity management.

1. **Enable Email Provider**:
   * Go to **Supabase Dashboard** -> **Authentication** -> **Providers** -> **Email**.
   * Toggle **Enable Email Provider** ON.
2. **Confirm Email settings (for quick testing)**:
   * For local testing or simple demo environments, toggle **Confirm email** OFF.
   * If enabled, users must click a confirmation link sent to their signup email before they can sign in.
3. **Configure Redirect URLs**:
   * Add `http://localhost:3000/auth/callback` to the Redirect URLs under **Authentication** -> **URL Configuration**.
   * For production, add `https://your-app.vercel.app/auth/callback`.

---

## ⚡ Edge Function Deployment

The AI generation is handled by Deno Edge Functions.

1. **Initialize CLI & Login**:
   ```bash
   npx supabase login
   ```
2. **Deploy the Function**:
   Link your CLI to the Supabase project ID and deploy:
   ```bash
   npx supabase link --project-ref your-project-ref-id
   npx supabase functions deploy generate-itinerary
   ```
3. **Configure Edge Function Secrets**:
   The function requires an OpenAI API key. Set it using the CLI secret command:
   ```bash
   npx supabase secrets set OPENAI_API_KEY=your_actual_openai_key
   ```

---

## ⚖️ Environment Variables

### Client-Side (Vercel & `.env.local`)
Configure these variables for both the local development server and Vercel:

```env
# Supabase project URL and anon public key
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Edge Function (Supabase Secrets)
Do **NOT** place these in Vercel or `.env.local` as they are server-side only:

```env
# Set in Supabase via: npx supabase secrets set OPENAI_API_KEY=...
OPENAI_API_KEY=sk-proj-...
```

---

## 🚀 Vercel Deployment

1. Sign in to your [Vercel Dashboard](https://vercel.com).
2. Click **New Project** and import your Git repository.
3. In **Environment Variables**, add:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel will automatically build, package, and host your Next.js application.

---

## 👤 Demo Account Preparation

To facilitate rapid reviews and showcase evaluations (e.g. during a hackathon demo or grading), configure a pre-registered tester account:

1. Go to **Supabase Dashboard** -> **Authentication** -> **Users**.
2. Click **Add User** -> **Create User**.
3. Create an account (e.g. `tctest@mailinator.com`) with a password of choice.
4. Confirm the email manually by clicking the user and hitting **Confirm email** (if confirmation settings are active).
5. Share these credentials with reviewers to bypass onboarding registration during evaluation.

---

## ⚠️ Known MVP Limitations

* **OpenAI API Rate Limits**: High volume concurrent generations may encounter OpenAI token-per-minute limits. Standard fallbacks will trigger and offer a "Load Demo Itinerary" options.
* **Email Provider Limits**: Free Supabase tiers limit SMTP signups to 3 requests per hour. Pre-configured demo accounts bypass this restriction.
* **Itinerary Editing Limits**: Adding *new* days or *new* activity nodes to an existing itinerary is currently not supported in the frontend MVP dashboard; users edit existing generated items instead.
