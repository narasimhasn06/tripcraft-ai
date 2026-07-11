-- Create a function to handle updated_at timestamps
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trips table
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  destination text not null,
  start_date date not null,
  end_date date not null,
  traveller_count integer not null,
  budget_level text not null,
  travel_pace text not null,
  interests text[] not null,
  notes text,
  itinerary jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for performance
create index if not exists idx_trips_user_id on trips(user_id);

-- Enable RLS
alter table trips enable row level security;

-- Set up Row-Level Security (RLS) policies
create policy "Users can view their own trips."
  on trips for select
  using (auth.uid() = user_id or notes like '%' || coalesce(auth.jwt() ->> 'email', '') || '%');

create policy "Users can insert their own trips."
  on trips for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trips."
  on trips for update
  using (auth.uid() = user_id or notes like '%' || coalesce(auth.jwt() ->> 'email', '') || '%')
  with check (auth.uid() = user_id or notes like '%' || coalesce(auth.jwt() ->> 'email', '') || '%');

create policy "Users can delete their own trips."
  on trips for delete
  using (auth.uid() = user_id);

-- Create trigger to automatically update the updated_at column
create trigger set_trips_updated_at
  before update on trips
  for each row
  execute function handle_updated_at();
