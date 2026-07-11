'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { 
  Compass, Plus, Calendar, Users, DollarSign, Activity, 
  Trash2, LogOut, ArrowRight, MapPin, Database, AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle').then((m) => m.ThemeToggle), {
  ssr: false,
  loading: () => <div className="p-2 h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0" />
});

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  traveller_count: number;
  budget_level: string;
  travel_pace: string;
  interests: string[];
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading, isConnected } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!user) return;
    setFetchError(null);
    try {
      if (isConnected) {
        // Fetch only the authenticated user's trips from Supabase, newest first
        const { data, error } = await supabase
          .from('trips')
          .select('id, title, destination, start_date, end_date, traveller_count, budget_level, travel_pace, interests, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTrips(data || []);
      } else {
        // Fetch from mock localStorage
        const storedTrips = localStorage.getItem('togethr_trips');
        if (storedTrips) {
          const parsedTrips = JSON.parse(storedTrips) as Trip[];
          setTrips(parsedTrips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      setFetchError(error instanceof Error ? error.message : 'An unexpected database error occurred.');
    } finally {
      setLoading(false);
    }
  }, [user, isConnected]);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        fetchTrips();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, fetchTrips]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this trip itinerary? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      if (isConnected) {
        // Delete from live Supabase
        const { error } = await supabase
          .from('trips')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setTrips(trips.filter(trip => trip.id !== id));
      } else {
        // Delete from mock localStorage
        const storedTrips = localStorage.getItem('togethr_trips');
        if (storedTrips) {
          const parsedTrips = JSON.parse(storedTrips) as Trip[];
          const filtered = parsedTrips.filter(t => t.id !== id);
          localStorage.setItem('togethr_trips', JSON.stringify(filtered));
          setTrips(filtered);
        }
      }
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete the trip. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || (loading && trips.length === 0 && !fetchError)) {
    return <LoadingState message="Loading your dashboard..." type="fullscreen" />;
  }

  // Helper to generate dynamic premium gradients based on destination name hash
  const getGradient = (destination: string) => {
    const gradients = [
      'from-rose-500/5 via-slate-900/40 to-slate-950/80 border-rose-500/15 hover:border-rose-500/30 hover:shadow-[0_0_20px_rgba(244,63,94,0.04)]',
      'from-amber-500/5 via-slate-900/40 to-slate-950/80 border-amber-500/15 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.04)]',
      'from-emerald-500/5 via-slate-900/40 to-slate-950/80 border-emerald-500/15 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.04)]',
      'from-cyan-500/5 via-slate-900/40 to-slate-950/80 border-cyan-500/15 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.04)]',
      'from-indigo-500/5 via-slate-900/40 to-slate-950/80 border-indigo-500/15 hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.04)]',
      'from-fuchsia-500/5 via-slate-900/40 to-slate-950/80 border-fuchsia-500/15 hover:border-fuchsia-500/30 hover:shadow-[0_0_20px_rgba(217,70,239,0.04)]',
    ];
    let sum = 0;
    for (let i = 0; i < destination.length; i++) {
      sum += destination.charCodeAt(i);
    }
    return gradients[sum % gradients.length];
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors duration-300">
      {/* Navigation Header */}
      <header className="relative border-b border-slate-200 dark:border-slate-900 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between overflow-hidden">
        {/* Consistent travel-themed background design pattern */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 dark:opacity-[0.04] pointer-events-none mix-blend-overlay z-0" 
          style={{ backgroundImage: "url('/landing_travel_bg.png')" }} 
        />
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-full bg-gradient-to-r from-indigo-500/5 via-emerald-500/5 to-transparent blur-xl pointer-events-none z-0" />
        
        <Link href="/dashboard" className="relative flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white group z-10" aria-label="togethr Home">
          <Compass className="h-6 w-6 text-indigo-400 group-hover:rotate-45 transition-transform duration-300" />
          <span>togethr</span>
        </Link>
        
        <div className="relative flex items-center gap-3 z-10">
          <ThemeToggle />
          <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline-block px-2.5 py-1 bg-slate-100/90 dark:bg-slate-900/80 rounded-full border border-slate-200 dark:border-slate-800">
            {user?.email}
          </span>
          <Button
            onClick={signOut}
            size="sm"
            variant="outline"
            className="hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all bg-white/80 dark:bg-slate-900/80"
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-1 flex flex-col">
        
        {/* Connection Status Checker Banner */}
        {!isConnected && (
          <div className="mb-8">
            <div className="flex items-start sm:items-center gap-2.5 px-4 py-3 bg-slate-900/60 border border-slate-900 text-slate-400 text-xs rounded-xl">
              <Database className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold text-slate-300">Sandbox Demo Mode</span> (Local Storage) &mdash; Set your credentials in <code className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800">.env.local</code> to activate live Supabase queries.
              </div>
            </div>
          </div>
        )}

        {/* Welcome row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-indigo-500 to-emerald-500 dark:from-indigo-300 dark:to-emerald-300 bg-clip-text text-transparent">Traveler</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1.5 text-sm">
              Explore your saved itineraries or draft a new custom travel plan.
            </p>
          </div>
          
          <Link href="/trips/new">
            <Button rightIcon={<Plus className="h-4 w-4" />}>
              Plan New Trip
            </Button>
          </Link>
        </div>

        {/* Error State display */}
        {fetchError ? (
          <div className="flex justify-center items-center py-12 flex-1">
            <ErrorState
              title="Database connection error"
              message={fetchError}
              action={
                <Button onClick={fetchTrips} leftIcon={<AlertTriangle className="h-4 w-4" />}>
                  Retry Connection
                </Button>
              }
            />
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            title="No itineraries found"
            description="You haven't planned any trips yet. Generate your first day-by-day travel plan using our AI planner!"
            action={
              <Link href="/trips/new">
                <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Get Started
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const gradientStyles = getGradient(trip.destination);
              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="block group"
                >
                  <Card 
                    hoverable 
                    className="relative overflow-hidden p-6 flex flex-col justify-between min-h-[220px] bg-slate-900/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80"
                  >
                    {/* Background image overlay */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-20 z-0 group-hover:scale-105 transition-transform duration-500" 
                      style={{ backgroundImage: "url('/travel_dashboard_card.jpg')" }} 
                    />
                    {/* Visual gradient overlay on top of the image to colorize it */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientStyles} opacity-10 dark:opacity-20 z-0`} />

                    <div className="relative z-10 flex-1 flex flex-col justify-between h-full">
                      <div>
                        {/* Top Row: Location & Actions */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-slate-900 dark:text-white font-bold text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-1">
                              {trip.title || `${trip.destination} Trip`}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                              <MapPin className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{trip.destination}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => handleDelete(trip.id, e)}
                            disabled={deletingId === trip.id}
                            aria-label="Delete trip"
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500/50 relative z-20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                          <span>
                            {new Date(trip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' - '}
                            {new Date(trip.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>

                        {/* Metadata tags */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Badge variant="indigo" className="flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {trip.traveller_count} {trip.traveller_count === 1 ? 'Guest' : 'Guests'}
                          </Badge>
                          <Badge variant="emerald" className="flex items-center gap-1">
                            <DollarSign className="h-2.5 w-2.5" />
                            {trip.budget_level}
                          </Badge>
                          <Badge variant="cyan" className="flex items-center gap-1">
                            <Activity className="h-2.5 w-2.5" />
                            {trip.travel_pace}
                          </Badge>
                          <Badge variant={trip.status === 'draft' ? 'amber' : 'emerald'} className="flex items-center gap-1 capitalize">
                            {trip.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Card Footer action indicator */}
                      <div className="mt-6 flex items-center justify-end text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors gap-1">
                        {isConnected && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 rounded mr-auto">
                            <Database className="h-3 w-3" />
                            <span>DB Saved</span>
                          </div>
                        )}
                        <span>View Itinerary</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
