-- Migration: Add save_generated_itinerary RPC function for atomic transactional updates
-- Creation Date: 2026-07-11 12:00:00
-- Description: Updates trip title, ai_summary, status and atomic inserts of itinerary days and activities in a single transaction.

create or replace function public.save_generated_itinerary(
  p_trip_id uuid,
  p_title text,
  p_ai_summary text,
  p_days jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  day_record jsonb;
  activity_record jsonb;
  v_day_id uuid;
  v_result jsonb;
begin
  -- 1. Check ownership
  select user_id into v_user_id from public.trips where id = p_trip_id;
  if v_user_id is null then
    raise exception 'Trip not found';
  end if;
  
  if v_user_id is distinct from auth.uid() then
    raise exception 'Unauthorized';
  end if;

  -- 2. Update trip title, ai_summary, status
  update public.trips
  set title = p_title,
      ai_summary = p_ai_summary,
      status = 'generated',
      updated_at = now()
  where id = p_trip_id;

  -- 3. Delete existing itinerary days (cascades to activities)
  delete from public.itinerary_days where trip_id = p_trip_id;

  -- 4. Insert itinerary days & activities
  for day_record in select * from jsonb_array_elements(p_days)
  loop
    insert into public.itinerary_days (trip_id, day_number, itinerary_date, title, summary)
    values (
      p_trip_id,
      (day_record->>'dayNumber')::integer,
      (day_record->>'date')::date,
      day_record->>'title',
      day_record->>'summary'
    )
    returning id into v_day_id;

    for activity_record in select * from jsonb_array_elements(day_record->'activities')
    loop
      insert into public.activities (
        itinerary_day_id,
        sort_order,
        start_time,
        title,
        description,
        location,
        estimated_cost,
        category
      )
      values (
        v_day_id,
        (activity_record->>'sortOrder')::integer,
        (activity_record->>'startTime')::time,
        activity_record->>'title',
        activity_record->>'description',
        activity_record->>'location',
        activity_record->>'estimatedCost',
        activity_record->>'category'
      );
    end loop;
  end loop;

  -- 5. Return the full completed itinerary structure matching TripWithItinerary
  select jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'destination', t.destination,
    'start_date', t.start_date,
    'end_date', t.end_date,
    'traveller_count', t.traveller_count,
    'budget_level', t.budget_level,
    'travel_pace', t.travel_pace,
    'interests', t.interests,
    'status', t.status,
    'ai_summary', t.ai_summary,
    'itinerary_days', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', d.id,
            'day_number', d.day_number,
            'itinerary_date', d.itinerary_date,
            'title', d.title,
            'summary', d.summary,
            'activities', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', a.id,
                    'sort_order', a.sort_order,
                    'start_time', a.start_time,
                    'title', a.title,
                    'description', a.description,
                    'location', a.location,
                    'estimated_cost', a.estimated_cost,
                    'category', a.category
                  ) order by a.sort_order
                )
                from public.activities a
                where a.itinerary_day_id = d.id
              ),
              '[]'::jsonb
            )
          ) order by d.day_number
        )
        from public.itinerary_days d
        where d.trip_id = t.id
      ),
      '[]'::jsonb
    )
  ) into v_result
  from public.trips t
  where t.id = p_trip_id;

  return v_result;
end;
$$;
