-- SQL Patch: Resolve Travel Plan Sharing (RLS) Policy Bug
-- Description: Sets up public.current_user_email() helper and updates RLS policies.

-- 1. Create or replace the email claim helper function
create or replace function public.current_user_email()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    auth.jwt() ->> 'email'
  )::text;
$$;

-- 2. Trips Policies Updates
drop policy if exists "Users can select own trips" on trips;
drop policy if exists "Users can view their own trips." on trips;
create policy "Users can select own trips"
  on trips for select
  using (
    auth.uid() = user_id 
    or (
      public.current_user_email() is not null 
      and public.current_user_email() <> '' 
      and notes ilike '%' || public.current_user_email() || '%'
    )
  );

drop policy if exists "Users can update own trips" on trips;
drop policy if exists "Users can update their own trips." on trips;
create policy "Users can update own trips"
  on trips for update
  using (
    auth.uid() = user_id 
    or (
      public.current_user_email() is not null 
      and public.current_user_email() <> '' 
      and notes ilike '%' || public.current_user_email() || '%'
    )
  )
  with check (
    auth.uid() = user_id 
    or (
      public.current_user_email() is not null 
      and public.current_user_email() <> '' 
      and notes ilike '%' || public.current_user_email() || '%'
    )
  );

-- 3. Itinerary Days Policies Updates
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
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
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
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
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
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
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
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
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
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
        )
      )
    )
  );

-- 4. Activities Policies Updates
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
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
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
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
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
      where itinerary_day_id = itinerary_days.id
      and (
        trips.user_id = auth.uid() 
        or (
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
        )
      )
    )
  )
  with check (
    exists (
      select 1 from itinerary_days
      join trips on trips.id = itinerary_days.trip_id
      where itinerary_day_id = itinerary_days.id
      and (
        trips.user_id = auth.uid() 
        or (
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
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
          public.current_user_email() is not null 
          and public.current_user_email() <> '' 
          and trips.notes ilike '%' || public.current_user_email() || '%'
        )
      )
    )
  );
