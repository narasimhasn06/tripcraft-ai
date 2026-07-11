/**
 * TripCraft AI – Shared Database Types
 *
 * These types reflect the relational Supabase schema:
 *   profiles → trips → itinerary_days → activities
 *
 * The `itinerary` JSONB column on trips is intentionally OMITTED from the
 * TripRow type because it will only be written by the Supabase Edge Function
 * (OpenAI integration, upcoming task). Frontend code must not read or write it.
 */

// ---------------------------------------------------------------------------
// Row types (what comes back from Supabase selects)
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripRow {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;   // ISO date "YYYY-MM-DD"
  end_date: string;     // ISO date "YYYY-MM-DD"
  traveller_count: number;
  budget_level: string;
  travel_pace: string;
  interests: string[];
  notes: string | null;
  status: string;       // 'draft' | 'generated' | 'confirmed'
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItineraryDayRow {
  id: string;
  trip_id: string;
  day_number: number;
  itinerary_date: string | null; // ISO date
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityRow {
  id: string;
  itinerary_day_id: string;
  sort_order: number;
  start_time: string | null; // "HH:MM:SS"
  title: string;
  description: string | null;
  location: string | null;
  estimated_cost: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Composite / joined types used in the frontend
// ---------------------------------------------------------------------------

/** A day with its activities, as returned by a nested Supabase select */
export interface ItineraryDayWithActivities extends ItineraryDayRow {
  activities: ActivityRow[];
}

/** A full trip with nested itinerary days and activities */
export interface TripWithItinerary extends TripRow {
  itinerary_days: ItineraryDayWithActivities[];
}

// ---------------------------------------------------------------------------
// Insert / update payload types
// ---------------------------------------------------------------------------

export type TripInsert = Omit<TripRow, 'id' | 'created_at' | 'updated_at'>;

export type TripUpdate = Partial<
  Pick<TripRow, 'title' | 'notes' | 'status' | 'ai_summary'>
>;
