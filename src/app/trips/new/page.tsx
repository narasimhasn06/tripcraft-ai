'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Compass, ArrowLeft, Sparkles, MapPin, Calendar, X, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle').then((m) => m.ThemeToggle), {
  ssr: false,
  loading: () => <div className="p-2 h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0" />
});

// Types from shared schema
import type { TripRow } from '@/lib/types';

const INTEREST_OPTIONS = [
  { id: 'Culture', label: '🕌 Culture' },
  { id: 'Food', label: '🍜 Food' },
  { id: 'Nature', label: '🏔️ Nature' },
  { id: 'Adventure', label: '🪂 Adventure' },
  { id: 'Shopping', label: '🛍️ Shopping' },
  { id: 'Nightlife', label: '🍻 Nightlife' },
  { id: 'Family', label: '👶 Family' },
  { id: 'Relaxation', label: '💆 Relaxation' },
];

const LOADING_STEPS = [
  'Initializing AI Travel Planner...',
  'Understanding your travel style...',
  'Analyzing your destination and dates...',
  'Balancing activities and rest...',
  'Curating local hidden gems & highlights...',
  'Building your day-by-day journey...',
  'Adjusting slots for budget & pace levels...',
  'Crafting rich activity descriptions...',
  'Almost ready! Finalizing your itinerary...',
];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(img.src);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
  });
};

export default function NewTripPage() {
  const router = useRouter();
  const { isConnected, user } = useAuth();
  
  // Form State
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travellerCount, setTravellerCount] = useState(1);
  const [budgetLevel, setBudgetLevel] = useState('moderate');
  const [travelPace, setTravelPace] = useState('balanced');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [tripImages, setTripImages] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  
  // UI & Loading States
  const [loading, setLoading] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);

  // Cycle loading steps
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  const handleInterestToggle = (id: string) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter((item) => item !== id));
    } else {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const openCamera = async () => {
    setIsCameraOpen(true);
    setCapturedSelfie(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setCameraStream(stream);
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Could not access camera. Please check camera permissions.');
      setIsCameraOpen(false);
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCapturedSelfie(null);
  };

  const captureSelfie = () => {
    const video = document.getElementById('selfie-video') as HTMLVideoElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedSelfie(base64);
    }
  };

  const saveSelfie = () => {
    if (!capturedSelfie) return;
    try {
      const img = new Image();
      img.src = capturedSelfie;
      img.onload = () => {
        const compCanvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        compCanvas.width = width;
        compCanvas.height = height;
        const compCtx = compCanvas.getContext('2d');
        if (compCtx) {
          compCtx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = compCanvas.toDataURL('image/jpeg', 0.7);
          setTripImages(prev => [...prev, compressedBase64]);
        }
      };
      closeCamera();
    } catch (err) {
      console.error('Failed to save captured selfie:', err);
    }
  };

  const handleDriveUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setError(null);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressedBase64 = await compressImage(file);
        setTripImages(prev => [...prev, compressedBase64]);
      } catch (err) {
        console.error('Failed to compress file:', err);
      }
    }
    e.target.value = '';
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    if (!destination || !startDate || !endDate || travellerCount < 1 || selectedInterests.length === 0) {
      setError('Please fill in all required fields and select at least one interest.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Prevent end dates before start dates
    if (start > end) {
      setError('Start date must be before or equal to the end date.');
      return;
    }

    // Prevent past end dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (end < today) {
      setError('End date cannot be in the past.');
      return;
    }

    // Maximum supported trip duration of seven days
    const timeDiff = Math.abs(end.getTime() - start.getTime());
    const dayCount = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
    if (dayCount > 7) {
      setError('This MVP version only supports trip durations up to 7 days.');
      setTimeout(() => {
        const endDateEl = document.getElementById('endDate') as HTMLInputElement | null;
        if (endDateEl) {
          endDateEl.focus();
        }
      }, 0);
      return;
    }

    // Traveller count validation (constrained between 1 and 20 in migration)
    if (travellerCount < 1 || travellerCount > 20) {
      setError('Number of travelers must be between 1 and 20.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const primaryCover = tripImages[0] || null;
      const listImages = tripImages.join('|||');

      let formattedNotes = notes.trim() || null;
      if (primaryCover) {
        formattedNotes = formattedNotes 
          ? `${formattedNotes}\n\n[cover_image]:# (${primaryCover})` 
          : `[cover_image]:# (${primaryCover})`;
      }
      if (listImages) {
        formattedNotes = formattedNotes
          ? `${formattedNotes}\n\n[trip_images]:# (${listImages})`
          : `[trip_images]:# (${listImages})`;
      }

      if (isConnected && user) {
        let activeTripId = createdTripId;

        // Step 1: Create draft trip if not already created
        if (!activeTripId) {
          const { data: savedTrip, error: saveError } = await supabase
            .from('trips')
            .insert({
              user_id: user.id,
              title: `${destination} Trip`,
              destination,
              start_date: startDate,
              end_date: endDate,
              traveller_count: travellerCount,
              budget_level: budgetLevel,
              travel_pace: travelPace,
              interests: selectedInterests,
              notes: formattedNotes,
              status: 'draft',
            })
            .select('id')
            .single();

          if (saveError) throw saveError;
          activeTripId = savedTrip.id;
          setCreatedTripId(activeTripId);
        }

        // Step 2: Invoke Edge Function with a 60s client-side timeout
        const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Generation timed out. The AI service is taking longer than expected. Please try again.')), 60000)
        );

        const invokePromise = supabase.functions.invoke('generate-itinerary', {
          body: { trip_id: activeTripId },
        });

        const raceResult = (await Promise.race([invokePromise, timeoutPromise])) as {
          data: unknown;
          error: { message: string } | null;
        };

        if (raceResult.error) {
          throw new Error(raceResult.error.message || 'Failed to generate itinerary. Please try again.');
        }

        // Success - navigate to trip details
        router.push(`/trips/${activeTripId}`);
      } else {
        // ⚠️  DEV FALLBACK — localStorage sandbox.
        setTimeout(() => {
          try {
            const newTrip = {
              id: createdTripId || crypto.randomUUID(),
              user_id: user?.id ?? 'local-user',
              title: `${destination} Trip`,
              destination,
              start_date: startDate,
              end_date: endDate,
              traveller_count: travellerCount,
              budget_level: budgetLevel,
              travel_pace: travelPace,
              interests: selectedInterests,
              notes: formattedNotes,
              status: 'generated',
              created_at: new Date().toISOString(),
            };

            if (!createdTripId) {
              const existingTripsStr = localStorage.getItem('togethr_trips') || '[]';
              const existingTrips = JSON.parse(existingTripsStr);
              existingTrips.push(newTrip);
              localStorage.setItem('togethr_trips', JSON.stringify(existingTrips));
              setCreatedTripId(newTrip.id);
            }

            router.push(`/trips/${newTrip.id}`);
          } catch (err) {
            console.error('[DEV FALLBACK] Error:', err);
            setError('Failed to create trip locally.');
            setLoading(false);
          }
        }, 3000);
      }
    } catch (err: unknown) {
      console.error('Itinerary generation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during generation.');
      setLoading(false);
    }
  };

  const isAiFailure = !!(
    error &&
    (error.toLowerCase().includes('ai') ||
      error.toLowerCase().includes('openai') ||
      error.toLowerCase().includes('timed out') ||
      error.toLowerCase().includes('timeout') ||
      error.toLowerCase().includes('api error'))
  );

  const handleLoadDemoItinerary = async () => {
    if (!createdTripId) return;
    setLoading(true);
    setError(null);

    try {
      const { buildDemoItinerary } = await import('@/lib/demoItinerary');
      const demo = buildDemoItinerary(destination, startDate, endDate);

      if (isConnected && user) {
        // Call RPC function to populate days and activities
        const { error: saveError } = await supabase.rpc('save_generated_itinerary', {
          p_trip_id: createdTripId,
          p_title: demo.tripTitle,
          p_ai_summary: demo.summary,
          p_days: demo.days,
        });

        if (saveError) throw saveError;

        // Set status specifically to 'demo' to show the badge/label on details page
        const { error: statusError } = await supabase
          .from('trips')
          .update({ status: 'demo' })
          .eq('id', createdTripId);

        if (statusError) throw statusError;

        router.push(`/trips/${createdTripId}`);
      } else {
        // Local fallback
        const raw = localStorage.getItem('togethr_trips') || '[]';
        const trips = JSON.parse(raw) as TripRow[];
        const updated = trips.map((t: TripRow) =>
          t.id === createdTripId
            ? { ...t, title: demo.tripTitle, status: 'demo', ai_summary: demo.summary }
            : t
        );
        localStorage.setItem('togethr_trips', JSON.stringify(updated));
        router.push(`/trips/${createdTripId}`);
      }
    } catch (err: unknown) {
      console.error('Error loading demo itinerary:', err);
      setError(err instanceof Error ? err.message : 'Failed to save demo itinerary.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white min-h-screen relative overflow-hidden px-4" role="status" aria-live="polite">
        {/* Glowing backgrounds */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px]" />
        
        <div className="z-10 text-center max-w-md w-full space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-ping" />
            <div className="p-4 bg-slate-900 border border-indigo-500/30 rounded-full text-indigo-400 relative">
              <Compass className="h-12 w-12 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Generating AI Itinerary</h2>
            <div className="h-7 flex justify-center items-center">
              <p className="text-slate-400 text-sm font-medium transition-all duration-500 animate-pulse">
                {LOADING_STEPS[loadingStepIdx]}
              </p>
            </div>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-1.5 border border-slate-900/80 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${((loadingStepIdx + 1) / LOADING_STEPS.length) * 100}%` }}
            />
          </div>

          <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed mt-4">
            Note: Generated daily schedules, activities, and estimated costs are automated AI predictions and do not represent confirmed bookings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors duration-300">
      {/* Navigation Header */}
      <header className="relative border-b border-slate-200 dark:border-slate-900 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between overflow-hidden">
        {/* Consistent travel-themed background design pattern */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 dark:opacity-[0.04] pointer-events-none mix-blend-overlay z-0" 
          style={{ backgroundImage: "url('/travel_landing.jpg')" }} 
        />
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-full bg-gradient-to-r from-indigo-500/5 via-emerald-500/5 to-transparent blur-xl pointer-events-none z-0" />
        
        <Link href="/dashboard" className="relative flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white group z-10">
          <Compass className="h-6 w-6 text-indigo-400 group-hover:rotate-45 transition-transform duration-350" />
          <span>togethr</span>
        </Link>
        <div className="relative flex items-center gap-4 z-10">
          <ThemeToggle />
          <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline-block px-2.5 py-1 bg-slate-100/90 dark:bg-slate-900/80 rounded-full border border-slate-200 dark:border-slate-900">
            {user?.email}
          </span>
          <Link href="/dashboard">
            <Button size="sm" variant="outline" className="bg-white/80 dark:bg-slate-900/80" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Form Container */}
      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 mt-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isConnected ? 'Supabase Database Mode' : 'Sandbox Fallback Mode'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Plan a new adventure</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            Enter your travel coordinates below to generate an edit-ready daily trip itinerary.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <span className="font-bold shrink-0">Generation Issue:</span>
              <span>{error}</span>
            </div>
            {createdTripId && (
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSubmit()}
                  className="text-xs border-red-500/30 hover:bg-red-500/15 text-red-300"
                >
                  Try Again
                </Button>
                {isAiFailure && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleLoadDemoItinerary}
                    className="text-xs text-white"
                  >
                    Load Demo Itinerary
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
          {/* Destination */}
          <Input
            id="destination"
            label="Where do you want to go? *"
            type="text"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Kyoto, Paris, Tokyo, London, Rome"
            leftIcon={<MapPin className="h-4.5 w-4.5 text-slate-500" />}
          />

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="startDate"
              label="Start Date *"
              type={startDate ? "date" : "text"}
              required
              placeholder="YYYY-MM-DD"
              value={startDate}
              onClick={(e) => {
                e.currentTarget.type = "date";
                try {
                  e.currentTarget.showPicker();
                } catch (err) {}
              }}
              onDoubleClick={(e) => {
                e.currentTarget.type = "text";
              }}
              onBlur={(e) => {
                if (!e.target.value) {
                  e.target.type = "text";
                }
              }}
              onChange={(e) => setStartDate(e.target.value)}
              leftIcon={<Calendar className="h-4.5 w-4.5 text-slate-500" />}
            />
            <Input
              id="endDate"
              label="End Date *"
              type={endDate ? "date" : "text"}
              required
              placeholder="YYYY-MM-DD"
              value={endDate}
              onClick={(e) => {
                e.currentTarget.type = "date";
                try {
                  e.currentTarget.showPicker();
                } catch (err) {}
              }}
              onDoubleClick={(e) => {
                e.currentTarget.type = "text";
              }}
              onBlur={(e) => {
                if (!e.target.value) {
                  e.target.type = "text";
                }
              }}
              onChange={(e) => setEndDate(e.target.value)}
              leftIcon={<Calendar className="h-4.5 w-4.5 text-slate-500" />}
            />
          </div>

          {/* Traveller Count */}
          <div className="space-y-2">
            <label htmlFor="travellers" className="block text-xs font-semibold text-slate-300 tracking-wide">
              Number of Travelers * (Limit 1 - 20)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTravellerCount(Math.max(1, travellerCount - 1))}
                className="w-10 h-10 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white hover:border-slate-700 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                -
              </button>
              <div className="w-16 h-10 flex items-center justify-center bg-slate-950/50 border border-slate-800 rounded-lg text-white font-semibold text-sm">
                {travellerCount}
              </div>
              <button
                type="button"
                onClick={() => setTravellerCount(Math.min(20, travellerCount + 1))}
                className="w-10 h-10 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:text-white hover:border-slate-700 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                +
              </button>
              <span className="text-xs text-slate-500 ml-2">
                {travellerCount === 1 ? 'Solo trip' : travellerCount === 2 ? 'Couple/Duo trip' : 'Group trip'}
              </span>
            </div>
          </div>

          {/* Budget & Pace Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Select
              id="budgetLevel"
              label="Budget Level *"
              value={budgetLevel}
              onChange={(e) => setBudgetLevel(e.target.value)}
              options={[
                { value: 'budget', label: 'Budget (Backpacker/Minimalist)' },
                { value: 'moderate', label: 'Moderate (Standard/Comfort)' },
                { value: 'premium', label: 'Premium (Exquisite/Luxury)' },
              ]}
            />
            
            <Select
              id="travelPace"
              label="Travel Pace *"
              value={travelPace}
              onChange={(e) => setTravelPace(e.target.value)}
              options={[
                { value: 'relaxed', label: 'Relaxed (Slow/Comfortable)' },
                { value: 'balanced', label: 'Balanced (Active/Standard)' },
                { value: 'packed', label: 'Packed (Action-packed/Busy)' },
              ]}
            />
          </div>

          {/* Interests */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 tracking-wide">
              Interests & Activities * (Select at least one)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => handleInterestToggle(interest.id)}
                    className={`flex items-center justify-center p-3 text-xs font-semibold rounded-xl border text-center transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isSelected 
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/5' 
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    {interest.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trip Photos */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 tracking-wide">
              Trip Photos (Optional - Select single/multiple or take onscreen selfie)
            </label>

            <div className="flex flex-wrap gap-3 items-center">
              {tripImages.map((imgUrl, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/60 group shadow-md animate-in zoom-in-95 duration-200">
                  <img src={imgUrl} alt={`Uploaded photo ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-indigo-500 text-[8px] font-bold text-white rounded uppercase tracking-wider">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setTripImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 p-1 bg-red-650/90 hover:bg-red-700 text-white rounded-lg shadow-md transition-all focus:outline-none cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add triggers */}
              <div className="flex gap-2">
                <label className="flex flex-col items-center justify-center w-20 h-20 border border-dashed border-slate-800 hover:border-slate-750 rounded-xl cursor-pointer bg-slate-950/40 hover:bg-slate-950/60 transition-colors">
                  <Plus className="h-5 w-5 mb-0.5 text-indigo-400" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Drive</span>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handleDriveUpload} />
                </label>

                <button
                  type="button"
                  onClick={openCamera}
                  className="flex flex-col items-center justify-center w-20 h-20 border border-dashed border-slate-800 hover:border-slate-750 rounded-xl bg-slate-950/40 hover:bg-slate-950/60 transition-colors cursor-pointer"
                >
                  <Compass className="h-5 w-5 mb-0.5 text-indigo-400 animate-pulse" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Selfie</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <Textarea
            id="notes"
            label="Optional Notes or Custom Requests"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Vegetarian cafes only, morning museum slots, or wheelchair accessible routes."
          />

          {/* Actions */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full py-3.5 flex justify-center items-center gap-2"
              rightIcon={<Sparkles className="h-4 w-4 animate-pulse text-emerald-350" />}
            >
              Generate My Itinerary
            </Button>
          </div>
        </form>
      </main>

      {/* Selfie Capture Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={closeCamera} 
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
              <Compass className="h-5 w-5 text-indigo-400 animate-spin" />
              <span>Take a Selfie</span>
            </h3>

            {/* Video Feed / Capture Preview */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
              {!capturedSelfie ? (
                <>
                  <video
                    id="selfie-video"
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                    ref={(el) => {
                      if (el && cameraStream && el.srcObject !== cameraStream) {
                        el.srcObject = cameraStream;
                      }
                    }}
                  />
                  <div className="absolute inset-0 border-[3px] border-dashed border-indigo-500/30 rounded-full m-8 pointer-events-none" />
                </>
              ) : (
                <img src={capturedSelfie} alt="Captured Selfie" className="w-full h-full object-cover" />
              )}
            </div>

            {/* Controls */}
            <div className="mt-6 flex gap-3 w-full">
              {!capturedSelfie ? (
                <Button
                  onClick={captureSelfie}
                  className="w-full py-2.5 flex justify-center items-center gap-1.5"
                >
                  <Compass className="h-4 w-4" /> Snap Photo
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setCapturedSelfie(null)}
                    variant="outline"
                    className="w-1/2 py-2.5"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={saveSelfie}
                    className="w-1/2 py-2.5"
                  >
                    Use Photo
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
