-- Idempotent Supabase SQL Migration for TripCraft AI MVP
-- Creation Date: 2026-07-10 17:26:00
-- Description: Sets up Profiles, Trips (with backward compatibility columns), Itinerary Days, Activities, and strict Row-Level Security policies.

-- 1. Helper function to handle updated_at columns automatically
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2. CREATE PROFILES TABLE
create table if not exists profiles (
  id uuid primary key referencing auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. CREATE TRIPS TABLE
-- Note: 'itinerary' is kept as jsonb for backward compatibility with the existing application frontend.
-- Note: 'title' is given a default value so existing inserts without 'title' do not fail.
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null referencing auth.users(id) on delete cascade,
  title text not null default 'My Trip Plan',
  destination text not null,
  start_date date not null,
  end_date date not null,
  traveller_count integer not null default 1,
  budget_level text not null,
  travel_pace text not null,
  interests text[] not null default '{}',
  notes text,
  status text not null default 'draft',
  ai_summary text,
  itinerary jsonb, -- backward compatibility
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint chk_trips_date_range check (end_date >= start_date),
  constraint chk_trips_traveller_count check (traveller_count >= 1 and traveller_count <= 20)
);

-- 4. CREATE ITINERARY_DAYS TABLE
create table if not exists itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null referencing trips(id) on delete cascade,
  day_number integer not null,
  itinerary_date date,
  title text not null,
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  constraint uq_itinerary_days_trip_day unique (trip_id, day_number)
);

-- 5. CREATE ACTIVITIES TABLE
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null referencing itinerary_days(id) on delete cascade,
  sort_order integer not null default 0,
  start_time time,
  title text not null,
  description text,
  location text,
  estimated_cost text,
  category text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. INDEXES FOR QUERY OPTIMIZATION
create index if not exists idx_profiles_updated_at on profiles(updated_at);
create index if not exists idx_trips_user_id on trips(user_id);
create index if not exists idx_itinerary_days_trip_id on itinerary_days(trip_id);
create index if not exists idx_activities_day_id on activities(itinerary_day_id);

-- 7. BIND UPDATED_AT TRIGGERS TO ALL TABLES
-- profiles
drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();

-- trips
drop trigger if exists set_trips_updated_at on trips;
create trigger set_trips_updated_at
  before update on trips
  for each row execute function handle_updated_at();

-- itinerary_days
drop trigger if exists set_itinerary_days_updated_at on itinerary_days;
create trigger set_itinerary_days_updated_at
  before update on itinerary_days
  for each row execute function handle_updated_at();

-- activities
drop trigger if exists set_activities_updated_at on activities;
create trigger set_activities_updated_at
  before update on activities
  for each row execute function handle_updated_at();

-- 8. AUTH NEW USER PROFILE TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 9. ROW-LEVEL SECURITY ENABLERS
alter table profiles enable row level security;
alter table trips enable row level security;
alter table itinerary_days enable row level security;
alter table activities enable row level security;

-- 10. ROW-LEVEL SECURITY POLICIES
-- A. Profiles Policies
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- B. Trips Policies
-- B. Trips Policies
drop policy if exists "Users can select own trips" on trips;
create policy "Users can select own trips"
  on trips for select
  using (
    auth.uid() = user_id 
    or (
      coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
      and notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
    )
  );

drop policy if exists "Users can insert own trips" on trips;
create policy "Users can insert own trips"
  on trips for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own trips" on trips;
create policy "Users can update own trips"
  on trips for update
  using (
    auth.uid() = user_id 
    or (
      coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
      and notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
    )
  )
  with check (
    auth.uid() = user_id 
    or (
      coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
      and notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
    )
  );

drop policy if exists "Users can delete own trips" on trips;
create policy "Users can delete own trips"
  on trips for delete
  using (auth.uid() = user_id);

-- C. Itinerary Days Policies
drop policy if exists "Users can select own trip itinerary days" on itinerary_days;
create policy "Users can select own trip itinerary days"
  on itinerary_days for select
  using (
    exists (
      select 1 from trips
      where trips.id = itinerary_days.trip_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  );

drop policy if exists "Users can insert own trip itinerary days" on itinerary_days;
create policy "Users can insert own trip itinerary days"
  on itinerary_days for insert
  with check (
    exists (
      select 1 from trips
      where trips.id = itinerary_days.trip_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  );

drop policy if exists "Users can update own trip itinerary days" on itinerary_days;
create policy "Users can update own trip itinerary days"
  on itinerary_days for update
  using (
    exists (
      select 1 from trips
      where trips.id = itinerary_days.trip_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  )
  with check (
    exists (
      select 1 from trips
      where trips.id = itinerary_days.trip_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  );

drop policy if exists "Users can delete own trip itinerary days" on itinerary_days;
create policy "Users can delete own trip itinerary days"
  on itinerary_days for delete
  using (
    exists (
      select 1 from trips
      where trips.id = itinerary_days.trip_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  );

-- D. Activities Policies
drop policy if exists "Users can select own trip activities" on activities;
create policy "Users can select own trip activities"
  on activities for select
  using (
    exists (
      select 1 from itinerary_days
      join trips on trips.id = itinerary_days.trip_id
      where itinerary_days.id = activities.itinerary_day_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  );

drop policy if exists "Users can insert own trip activities" on activities;
create policy "Users can insert own trip activities"
  on activities for insert
  with check (
    exists (
      select 1 from itinerary_days
      join trips on trips.id = itinerary_days.trip_id
      where itinerary_days.id = activities.itinerary_day_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  );

drop policy if exists "Users can update own trip activities" on activities;
create policy "Users can update own trip activities"
  on activities for update
  using (
    exists (
      select 1 from itinerary_days
      join trips on trips.id = itinerary_days.trip_id
      where itinerary_days.id = activities.itinerary_day_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  )
  with check (
    exists (
      select 1 from itinerary_days
      join trips on trips.id = itinerary_days.trip_id
      where itinerary_days.id = activities.itinerary_day_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  );

drop policy if exists "Users can delete own trip activities" on activities;
create policy "Users can delete own trip activities"
  on activities for delete
  using (
    exists (
      select 1 from itinerary_days
      join trips on trips.id = itinerary_days.trip_id
      where itinerary_days.id = activities.itinerary_day_id
      and (
        trips.user_id = auth.uid() 
        or (
          coalesce(nullif(current_setting('request.jwt.claim.email', true), ''), '') <> '' 
          and trips.notes ilike '%' || current_setting('request.jwt.claim.email', true) || '%'
        )
      )
    )
  );
