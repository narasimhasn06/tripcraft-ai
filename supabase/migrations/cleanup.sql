-- SQL Cleanup: Delete all travel, itinerary days, and activities data
-- Note: This cascades automatically to delete itinerary_days and activities.
-- Profiles and user accounts are preserved.

begin;

-- Truncate or delete trips (which cascade deletes itinerary_days and activities)
truncate table public.trips cascade;

commit;
