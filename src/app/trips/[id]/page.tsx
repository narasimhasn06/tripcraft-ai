'use client';

import React, { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { Textarea } from '@/components/ui/textarea';
import type { TripRow, ItineraryDayWithActivities, ActivityRow } from '@/lib/types';
import {
  ArrowLeft, Calendar, Users, DollarSign, Mail,
  Activity, MapPin, Trash2, Edit2,
  Save, AlertCircle, Sparkles, Clock, Database,
  FileText, CheckCircle2, X, Compass, Plus
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle').then((m) => m.ThemeToggle), {
  ssr: false,
  loading: () => <div className="p-2 h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0" />
});

interface PageProps {
  params: Promise<{ id: string }>;
}

type TripWithDays = TripRow & { itinerary_days: ItineraryDayWithActivities[] };

// ---------------------------------------------------------------------------
// Image & Text helpers for structured markdown storage in notes/summary
// ---------------------------------------------------------------------------
const extractImageAndText = (text: string | null | undefined, imageTag: string) => {
  if (!text) return { text: '', imageUrl: null };
  const regex = new RegExp(`\\s*\\[${imageTag}\\]:# \\((.*?)\\)`);
  const match = text.match(regex);
  const imageUrl = match ? match[1] : null;
  const cleanedText = text.replace(regex, '').trim();
  return { text: cleanedText, imageUrl };
};

const makeImageAndText = (text: string | null | undefined, imageUrl: string | null, imageTag: string) => {
  const cleanedText = text ? text.replace(new RegExp(`\\s*\\[${imageTag}\\]:# \\((.*?)\\)`), '').trim() : '';
  if (!imageUrl) return cleanedText;
  return cleanedText ? `${cleanedText}\n\n[${imageTag}]:# (${imageUrl})` : `[${imageTag}]:# (${imageUrl})`;
};

const getTravelersString = (notesContent: string | null | undefined): string | null => {
  if (!notesContent) return null;
  const match = notesContent.match(/\[travelers\]:# \((.*?)\)/);
  return match ? match[0] : null;
};

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

const getCategoryBorder = (category?: string | null) => {
  if (!category) return 'border-slate-800';
  const cats: Record<string, string> = {
    Culture: 'hover:border-indigo-500/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.04)] border-slate-800',
    Food: 'hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.04)] border-slate-800',
    Nature: 'hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.04)] border-slate-800',
    Adventure: 'hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.04)] border-slate-800',
    Shopping: 'hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.04)] border-slate-800',
    Nightlife: 'hover:border-rose-500/30 hover:shadow-[0_0_15px_rgba(244,63,94,0.04)] border-slate-800',
    Family: 'hover:border-teal-500/30 hover:shadow-[0_0_15px_rgba(20,184,166,0.04)] border-slate-800',
    Relaxation: 'hover:border-fuchsia-500/30 hover:shadow-[0_0_15px_rgba(217,70,239,0.04)] border-slate-800',
  };
  return cats[category] || 'border-slate-800';
};

const getCategoryBadgeVariant = (category?: string | null): 'indigo' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' => {
  if (!category) return 'slate';
  const mapping: Record<string, 'indigo' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate'> = {
    Culture: 'indigo',
    Food: 'amber',
    Nature: 'emerald',
    Adventure: 'cyan',
    Shopping: 'slate',
    Nightlife: 'rose',
    Family: 'cyan',
    Relaxation: 'indigo',
  };
  return mapping[category] || 'slate';
};

export default function TripDetails({ params }: PageProps) {
  const router = useRouter();
  const { user, loading: authLoading, isConnected } = useAuth();

  const resolvedParams = use(params);
  const tripId = resolvedParams.id;

  // Master data state
  const [trip, setTrip] = useState<TripWithDays | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editableTrip, setEditableTrip] = useState<TripWithDays | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Image Upload Modals state
  const [isPlanCoverModalOpen, setIsPlanCoverModalOpen] = useState(false);
  const [isDayCoverModalOpen, setIsDayCoverModalOpen] = useState(false);
  const [selectedDayForImage, setSelectedDayForImage] = useState<string | null>(null);

  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  // Camera & selfie state for details page
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [selfieTarget, setSelfieTarget] = useState<{ type: 'trip' } | { type: 'activity'; dayId: string; activityId: string } | null>(null);

  // Parse notes clean vs formatted, including travelers list
  const { text: cleanNotes, imageUrls: allTripImages, travelersList } = (() => {
    const notesContent = isEditing ? editableTrip?.notes : trip?.notes;
    const { text: firstClean, imageUrl: cover } = extractImageAndText(notesContent, 'cover_image');
    
    // Extract trip_images
    const imagesRegex = /\s*\[trip_images\]:# \((.*?)\)/;
    const imagesMatch = firstClean.match(imagesRegex);
    const listImages = imagesMatch ? imagesMatch[1].split('|||') : [];
    let processedText = firstClean.replace(imagesRegex, '').trim();

    // Extract travelers
    const travelersRegex = /\s*\[travelers\]:# \((.*?)\)/;
    const travelersMatch = processedText.match(travelersRegex);
    const travelersRaw = travelersMatch ? travelersMatch[1] : '';
    processedText = processedText.replace(travelersRegex, '').trim();

    // Parse travelers list
    const travelersList: { name: string; email: string }[] = [];
    if (travelersRaw) {
      travelersRaw.split('|||').forEach(pair => {
        const parts = pair.split(':');
        const name = parts[0] ? parts[0].trim() : '';
        const email = parts[1] ? parts[1].trim() : '';
        if (name || email) {
          travelersList.push({ name, email });
        }
      });
    }

    return { 
      text: processedText, 
      imageUrls: listImages.length > 0 ? listImages : (cover ? [cover] : []),
      travelersList 
    };
  })();

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
        const maxDim = 850;
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
          if (selfieTarget?.type === 'activity') {
            const { dayId, activityId } = selfieTarget;
            const act = editableTrip?.itinerary_days
              .find(d => d.id === dayId)?.activities
              .find(a => a.id === activityId);
            const notesContent = act?.notes || '';
            const regex = /\s*\[activity_images\]:# \((.*?)\)/;
            const match = notesContent.match(regex);
            const actImages = match ? match[1].split('|||') : [];
            handleUpdateActivityImages(dayId, activityId, [...actImages, compressedBase64]);
          } else {
            handleUpdateImages([...allTripImages, compressedBase64]);
          }
        }
      };
      closeCamera();
    } catch (err) {
      console.error('Failed to save captured selfie:', err);
    }
  };

  const handleUpdateActivityImages = (dayId: string, activityId: string, imageUrls: string[]) => {
    if (!editableTrip) return;
    const days = editableTrip.itinerary_days.map(d => {
      if (d.id !== dayId) return d;
      const activities = d.activities.map(a => {
        if (a.id !== activityId) return a;
        const notesContent = a.notes || '';
        const regex = /\s*\[activity_images\]:# \((.*?)\)/;
        const cleanText = notesContent.replace(regex, '').trim();
        const updatedNotes = imageUrls.length > 0
          ? `${cleanText}\n\n[activity_images]:# (${imageUrls.join('|||')})`.trim()
          : cleanText;
        return { ...a, notes: updatedNotes || null };
      });
      return { ...d, activities };
    });
    setEditableTrip({ ...editableTrip, itinerary_days: days });
  };

  const handleUpdateImages = (newImages: string[]) => {
    const { text: cleanNotesText } = (() => {
      const notesContent = editableTrip?.notes || trip?.notes;
      const { text: firstClean } = extractImageAndText(notesContent, 'cover_image');
      const regex = /\s*\[trip_images\]:# \((.*?)\)/;
      const travelersRegex = /\s*\[travelers\]:# \((.*?)\)/;
      const finalClean = firstClean.replace(regex, '').replace(travelersRegex, '').trim();
      return { text: finalClean };
    })();
    
    const primaryCover = newImages[0] || null;
    const listImages = newImages.join('|||');
    const travelersTag = getTravelersString(editableTrip?.notes || trip?.notes);
    
    let updatedNotes = cleanNotesText || null;
    if (primaryCover) {
      updatedNotes = updatedNotes 
        ? `${updatedNotes}\n\n[cover_image]:# (${primaryCover})` 
        : `[cover_image]:# (${primaryCover})`;
    }
    if (listImages) {
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n\n[trip_images]:# (${listImages})`
        : `[trip_images]:# (${listImages})`;
    }
    if (travelersTag) {
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n\n${travelersTag}`
        : travelersTag;
    }
    handleUpdateTripField('notes', updatedNotes);
  };

  // ---------------------------------------------------------------------------
  // Fetch Trip Data
  // ---------------------------------------------------------------------------
  const fetchTrip = useCallback(async () => {
    if (!user || !tripId) return;
    setError(null);
    try {
      if (isConnected) {
        const { data, error: fetchErr } = await supabase
          .from('trips')
          .select(`
            *,
            itinerary_days (
              *,
              activities ( * )
            )
          `)
          .eq('id', tripId)
          .single();

        if (fetchErr) throw fetchErr;
        if (!data) throw new Error('Trip not found.');

        // Sort days and activities by order fields
        const sorted: TripWithDays = {
          ...(data as TripRow),
          itinerary_days: ((data as TripWithDays).itinerary_days ?? [])
            .sort((a, b) => a.day_number - b.day_number)
            .map(day => ({
              ...day,
              activities: (day.activities ?? []).sort((a, b) => a.sort_order - b.sort_order),
            })),
        };
        setTrip(sorted);
        setEditableTrip(JSON.parse(JSON.stringify(sorted)));
      } else {
        // ⚠️ DEV FALLBACK
        const raw = localStorage.getItem('togethr_trips');
        if (!raw) throw new Error('No local trips found.');
        const trips = JSON.parse(raw) as TripRow[];
        const found = trips.find(t => t.id === tripId);
        if (!found) throw new Error('Trip not found in local storage.');
        const sortedLocal: TripWithDays = { ...found, itinerary_days: [] };
        setTrip(sortedLocal);
        setEditableTrip(JSON.parse(JSON.stringify(sortedLocal)));
      }
    } catch (err) {
      console.error('Error fetching trip:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trip.');
    } finally {
      setLoading(false);
    }
  }, [user, tripId, isConnected]);

  useEffect(() => {
    if (user && tripId) {
      const t = setTimeout(() => fetchTrip(), 0);
      return () => clearTimeout(t);
    }
  }, [user, tripId, fetchTrip]);

  // ---------------------------------------------------------------------------
  // Edit Handlers
  // ---------------------------------------------------------------------------
  const handleUpdateTripField = async <K extends keyof TripRow>(field: K, value: TripRow[K]) => {
    if (isEditing) {
      if (!editableTrip) return;
      setEditableTrip({ ...editableTrip, [field]: value });
    } else {
      if (!trip) return;
      const updatedTrip = { ...trip, [field]: value };
      setTrip(updatedTrip);
      try {
        if (isConnected) {
          const { error } = await supabase
            .from('trips')
            .update({ [field]: value })
            .eq('id', trip.id);
          if (error) throw error;
        } else {
          const stored = localStorage.getItem('togethr_trips');
          if (stored) {
            const parsed = JSON.parse(stored) as TripRow[];
            const updated = parsed.map(t => t.id === trip.id ? { ...t, [field]: value } : t);
            localStorage.setItem('togethr_trips', JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.error('Failed to save trip field directly:', err);
      }
    }
  };

  const handleUpdateDayField = async <K extends keyof ItineraryDayWithActivities>(
    dayId: string,
    field: K,
    value: ItineraryDayWithActivities[K]
  ) => {
    if (isEditing) {
      if (!editableTrip) return;
      const days = editableTrip.itinerary_days.map(d => 
        d.id === dayId ? { ...d, [field]: value } : d
      );
      setEditableTrip({ ...editableTrip, itinerary_days: days });
    } else {
      if (!trip) return;
      const days = trip.itinerary_days.map(d => 
        d.id === dayId ? { ...d, [field]: value } : d
      );
      const updatedTrip = { ...trip, itinerary_days: days };
      setTrip(updatedTrip);
      try {
        if (isConnected) {
          const { error } = await supabase
            .from('itinerary_days')
            .update({ [field]: value })
            .eq('id', dayId);
          if (error) throw error;
        } else {
          const stored = localStorage.getItem('togethr_trips');
          if (stored) {
            const parsed = JSON.parse(stored) as any[];
            const updated = parsed.map(t => {
              if (t.id !== trip.id) return t;
              const newDays = (t.itinerary_days || []).map((d: any) => 
                d.id === dayId ? { ...d, [field]: value } : d
              );
              return { ...t, itinerary_days: newDays };
            });
            localStorage.setItem('togethr_trips', JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.error('Failed to save day field directly:', err);
      }
    }
  };

  const handleUpdateActivityField = async <K extends keyof ActivityRow>(
    dayId: string,
    activityId: string,
    field: K,
    value: ActivityRow[K]
  ) => {
    if (isEditing) {
      if (!editableTrip) return;
      const days = editableTrip.itinerary_days.map(d => {
        if (d.id !== dayId) return d;
        const activities = d.activities.map(a => 
          a.id === activityId ? { ...a, [field]: value } : a
        );
        return { ...d, activities };
      });
      setEditableTrip({ ...editableTrip, itinerary_days: days });
    } else {
      if (!trip) return;
      const days = trip.itinerary_days.map(d => {
        if (d.id !== dayId) return d;
        const activities = d.activities.map(a => 
          a.id === activityId ? { ...a, [field]: value } : a
        );
        return { ...d, activities };
      });
      const updatedTrip = { ...trip, itinerary_days: days };
      setTrip(updatedTrip);
      try {
        if (isConnected) {
          const { error } = await supabase
            .from('activities')
            .update({ [field]: value })
            .eq('id', activityId);
          if (error) throw error;
        } else {
          const stored = localStorage.getItem('togethr_trips');
          if (stored) {
            const parsed = JSON.parse(stored) as any[];
            const updated = parsed.map(t => {
              if (t.id !== trip.id) return t;
              const newDays = (t.itinerary_days || []).map((d: any) => {
                if (d.id !== dayId) return d;
                const newActivities = (d.activities || []).map((a: any) => 
                  a.id === activityId ? { ...a, [field]: value } : a
                );
                return { ...d, activities: newActivities };
              });
              return { ...t, itinerary_days: newDays };
            });
            localStorage.setItem('togethr_trips', JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.error('Failed to save activity field directly:', err);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Save Itinerary Changes
  // ---------------------------------------------------------------------------
  const handleSaveChanges = async () => {
    if (!editableTrip || !trip) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const newStatus = trip.status === 'demo' ? 'generated' : trip.status;
      const updatedTrip = {
        ...editableTrip,
        status: newStatus
      };

      if (isConnected) {
        // 1. Update trip title, notes and transition status if it was 'demo'
        const { error: tripUpdateErr } = await supabase
          .from('trips')
          .update({
            title: updatedTrip.title,
            notes: updatedTrip.notes,
            status: newStatus,
          })
          .eq('id', tripId);
        if (tripUpdateErr) throw tripUpdateErr;

        // 2. Update days and activities
        for (const day of updatedTrip.itinerary_days) {
          const { error: dayUpdateErr } = await supabase
            .from('itinerary_days')
            .update({
              title: day.title,
              summary: day.summary,
            })
            .eq('id', day.id);
          if (dayUpdateErr) throw dayUpdateErr;

          for (const activity of day.activities) {
            const { error: actUpdateErr } = await supabase
              .from('activities')
              .update({
                start_time: activity.start_time,
                title: activity.title,
                description: activity.description,
                location: activity.location,
                estimated_cost: activity.estimated_cost,
                category: activity.category,
                notes: activity.notes,
              })
              .eq('id', activity.id);
            if (actUpdateErr) throw actUpdateErr;
          }
        }
      } else {
        // ⚠️ DEV FALLBACK
        const raw = localStorage.getItem('togethr_trips') ?? '[]';
        const trips = JSON.parse(raw) as TripRow[];
        const updated = trips.map(t => 
          t.id === tripId ? { ...t, title: updatedTrip.title, notes: updatedTrip.notes, status: newStatus } : t
        );
        localStorage.setItem('togethr_trips', JSON.stringify(updated));
      }

      // Sync state and notify success
      setTrip(updatedTrip);
      setEditableTrip(updatedTrip);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Error saving changes:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setEditableTrip(JSON.parse(JSON.stringify(trip)));
    setIsEditing(false);
    setError(null);
  };

  // ---------------------------------------------------------------------------
  // Delete Trip
  // ---------------------------------------------------------------------------
  const handleDeleteTrip = async () => {
    if (!confirm('Are you sure you want to delete this trip permanently? All generated days and activities will be lost.')) return;
    setDeleting(true);
    try {
      if (isConnected) {
        const { error: deleteErr } = await supabase
          .from('trips')
          .delete()
          .eq('id', tripId);
        if (deleteErr) throw deleteErr;
        router.push('/dashboard');
      } else {
        // ⚠️ DEV FALLBACK
        const raw = localStorage.getItem('togethr_trips') ?? '[]';
        const trips = JSON.parse(raw) as TripRow[];
        localStorage.setItem('togethr_trips', JSON.stringify(trips.filter(t => t.id !== tripId)));
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip.');
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading & Error states
  // ---------------------------------------------------------------------------
  if (authLoading || loading) {
    return <LoadingState message="Loading itinerary details..." type="fullscreen" />;
  }

  if (error && !isEditing) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-white px-4 min-h-screen">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Error Loading Trip</h3>
        <p className="text-slate-400 text-sm text-center max-w-sm mb-6">
          {error}
        </p>
        <Link href="/dashboard">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const currentTrip = isEditing ? editableTrip : trip;
  if (!currentTrip) return null;
  const isOwner = currentTrip.user_id === user?.id || currentTrip.user_id === 'local-user';

  const planCoverImage = allTripImages[0] || null;
  const hasDays = currentTrip.itinerary_days.length > 0;

  const handleSelectPlanCover = (url: string | null) => {
    const remainingImages = allTripImages.slice(1);
    const newImages = url ? [url, ...remainingImages] : remainingImages;
    handleUpdateImages(newImages);
  };

  const handleSelectDayCover = (url: string | null) => {
    if (!selectedDayForImage) return;
    const day = currentTrip.itinerary_days.find(d => d.id === selectedDayForImage);
    if (!day) return;
    const { text: cleanSummary } = extractImageAndText(day.summary, 'day_image');
    const updatedSummary = makeImageAndText(cleanSummary, url, 'day_image');
    handleUpdateDayField(selectedDayForImage, 'summary', updatedSummary || null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-300 font-sans">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="relative border-b border-slate-200 dark:border-slate-900 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-6 py-4 flex items-center justify-between overflow-hidden">
        {/* Consistent travel-themed background design pattern */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 dark:opacity-[0.04] pointer-events-none mix-blend-overlay z-0" 
          style={{ backgroundImage: "url('/travel_landing.jpg')" }} 
        />
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-full bg-gradient-to-r from-indigo-500/5 via-emerald-500/5 to-transparent blur-xl pointer-events-none z-0" />
        
        <Link href="/dashboard" className="relative flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white group z-10" aria-label="togethr Home">
          <Compass className="h-6 w-6 text-indigo-400 group-hover:rotate-45 transition-transform duration-300" />
          <span>togethr</span>
        </Link>
        
        <div className="relative flex items-center gap-3 z-10">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-[10px] uppercase font-bold rounded-lg tracking-wider animate-pulse">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Changes Saved</span>
            </div>
          )}
          <ThemeToggle />
          <span className="text-xs text-slate-600 dark:text-slate-400 hidden md:inline-block px-2.5 py-1 bg-slate-100/90 dark:bg-slate-900/80 rounded-full border border-slate-200 dark:border-slate-800">
            {user?.email}
          </span>
        </div>
      </header>

      {/* ── Hero Banner ────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden bg-white/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-900/60 min-h-[160px]">
        {/* If custom cover image exists, render it as background overlay */}
        {planCoverImage ? (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-20 pointer-events-none z-0 animate-in fade-in duration-300" 
            style={{ backgroundImage: `url('${planCoverImage}')` }} 
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/3 to-transparent z-0" />
        )}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/dashboard" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
                </Link>
                <span className="text-slate-400 dark:text-slate-700 text-xs">/</span>
                <Badge 
                  variant={currentTrip.status === 'demo' ? 'amber' : currentTrip.status === 'draft' ? 'amber' : 'emerald'} 
                  className="mb-0.5 capitalize font-semibold tracking-wider"
                >
                  {currentTrip.status === 'demo' ? 'Demo Itinerary' : currentTrip.status}
                </Badge>
              </div>
              
              {isEditing ? (
                <div className="space-y-2.5 max-w-xl">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Trip Title</label>
                    <input
                      type="text"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl px-4 py-2 text-slate-900 dark:text-white font-extrabold text-lg sm:text-xl focus:outline-none transition-all"
                      value={currentTrip.title}
                      onChange={(e) => handleUpdateTripField('title', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPlanCoverModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 dark:bg-slate-950/80 hover:bg-slate-900 dark:hover:bg-slate-950 text-white rounded-xl border border-slate-700/50 shadow-sm transition-all font-bold text-xs"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>{planCoverImage ? 'Change Cover Photo' : 'Upload Cover Photo'}</span>
                  </button>
                </div>
              ) : (
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight max-w-3xl">
                  {currentTrip.title}
                </h1>
              )}
              
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="text-slate-750 dark:text-slate-200 font-semibold">{currentTrip.destination}</span>
                </span>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>
                    {new Date(currentTrip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' – '}
                    {new Date(currentTrip.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {isOwner && hasDays && (
                isEditing ? (
                  <>
                    <Button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      variant="primary"
                      className="shadow-md shadow-indigo-600/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all"
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      onClick={handleCancelChanges}
                      disabled={saving}
                      variant="outline"
                      className="hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all"
                      leftIcon={<X className="h-3.5 w-3.5" />}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="secondary"
                    className="shadow-md shadow-emerald-600/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all"
                    leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                  >
                    Edit Itinerary
                  </Button>
                )
              )}
              {isOwner && (
                <Button
                  onClick={handleDeleteTrip}
                  disabled={deleting}
                  variant="danger"
                  className="hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline Editing Error Display */}
      {error && isEditing && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4.5 w-4.5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ── Main Layout Grid ───────────────────────────────────────────── */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left Summary Panel ───────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">
          <Card className="p-6 space-y-5 sticky top-24 border-slate-900/60 bg-slate-900/20">
            
            {/* Specs Block */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Specifications</span>
              
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-900/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Travelers
                </span>
                <Badge variant="indigo" className="font-semibold">
                  {currentTrip.traveller_count} {currentTrip.traveller_count === 1 ? 'Person' : 'People'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-900/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Budget
                </span>
                <Badge variant="emerald" className="capitalize font-semibold">{currentTrip.budget_level}</Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Travel Pace
                </span>
                <Badge variant="cyan" className="capitalize font-semibold">{currentTrip.travel_pace}</Badge>
              </div>
            </div>

            <hr className="border-slate-900/60" />

            {/* Interests */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5">Interests</span>
              <div className="flex flex-wrap gap-1.5">
                {currentTrip.interests.map((interest) => (
                  <span
                    key={interest}
                    className="text-[10px] font-semibold text-slate-300 bg-slate-950 px-2.5 py-1 border border-slate-800 rounded-lg"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {travelersList.length > 0 && (
              <>
                <hr className="border-slate-900/60" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5">Travelers List</span>
                  <div className="space-y-2">
                    {travelersList.map((traveler, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-xl bg-slate-950/40 border border-slate-900">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-200 dark:text-slate-200">
                            {traveler.name || `Traveler #${index + 2}`}
                          </span>
                        </div>
                        {traveler.email && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-450 dark:text-slate-400 font-medium">
                            <Mail className="h-3 w-3 text-indigo-400/80 shrink-0" />
                            <span className="truncate max-w-[200px]">{traveler.email}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <hr className="border-slate-900/60" />

            {/* Editable Notes */}
            <div>
              <label htmlFor="tripNotesInput" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Special Notes / Requests
              </label>
              {isEditing ? (
                <Textarea
                  id="tripNotesInput"
                  rows={4}
                  className="bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all rounded-xl"
                  value={cleanNotes || ''}
                  onChange={(e) => {
                    const text = e.target.value;
                    const primaryCover = allTripImages[0] || null;
                    const listImages = allTripImages.join('|||');
                    const travelersTag = getTravelersString(editableTrip?.notes || trip?.notes);
                    
                    let updatedNotes = text.trim() || null;
                    if (primaryCover) {
                      updatedNotes = updatedNotes 
                        ? `${updatedNotes}\n\n[cover_image]:# (${primaryCover})` 
                        : `[cover_image]:# (${primaryCover})`;
                    }
                    if (listImages) {
                      updatedNotes = updatedNotes
                        ? `${updatedNotes}\n\n[trip_images]:# (${listImages})`
                        : `[trip_images]:# (${listImages})`;
                    }
                    if (travelersTag) {
                      updatedNotes = updatedNotes
                        ? `${updatedNotes}\n\n${travelersTag}`
                        : travelersTag;
                    }
                    handleUpdateTripField('notes', updatedNotes);
                  }}
                  placeholder="e.g. Vegetarian diet, accessibility, quiet slots..."
                />
              ) : (
                <p className="text-xs text-slate-400 bg-slate-950/40 p-4 rounded-xl border border-slate-900 leading-relaxed min-h-[60px]">
                  {cleanNotes || 'No custom notes provided.'}
                </p>
              )}
            </div>

            <hr className="border-slate-900/60" />

            {/* Trip Photos */}
            {(isEditing || !isOwner) ? (
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Trip Photos
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {allTripImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/60 group shadow-md animate-in zoom-in-95 duration-200">
                      <img src={imgUrl} alt={`Trip photo ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 px-1 py-0.5 bg-indigo-500 text-[6px] font-bold text-white rounded uppercase tracking-wider">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = allTripImages.filter((_, i) => i !== idx);
                          handleUpdateImages(updated);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-650/90 hover:bg-red-700 text-white rounded-lg shadow-md transition-all focus:outline-none cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-1.5">
                    <label className="flex flex-col items-center justify-center w-16 h-16 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer bg-slate-950/40 hover:bg-slate-950/60 transition-colors">
                      <Plus className="h-4 w-4 mb-0.5 text-indigo-400" />
                      <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400">Drive</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        multiple 
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files) return;
                          const newImages = [...allTripImages];
                          for (let i = 0; i < files.length; i++) {
                            try {
                              const base64 = await compressImage(files[i]);
                              newImages.push(base64);
                            } catch (err) {
                              console.error(err);
                            }
                          }
                          handleUpdateImages(newImages);
                          e.target.value = '';
                        }} 
                      />
                    </label>

                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex flex-col items-center justify-center w-16 h-16 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl bg-slate-950/40 hover:bg-slate-950/60 transition-colors cursor-pointer"
                    >
                      <Compass className="h-4 w-4 mb-0.5 text-indigo-400 animate-pulse" />
                      <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400">Selfie</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              allTripImages.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Trip Photos ({allTripImages.length})
                  </span>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {allTripImages.slice(0, 3).map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:scale-105 active:scale-95 transition-transform shadow-sm cursor-pointer"
                        onClick={() => {
                          setGalleryImages(allTripImages);
                          setSelectedGalleryImage(imgUrl);
                        }}
                      >
                        <img src={imgUrl} alt={`Trip photo ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/60 text-[7px] py-0.5 text-center text-slate-400 font-bold uppercase tracking-wider">
                            Cover
                          </div>
                        )}
                      </div>
                    ))}
                    {allTripImages.length > 3 && (
                      <button
                        type="button"
                        className="w-16 h-16 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all hover:scale-105 cursor-pointer"
                        onClick={() => {
                          setGalleryImages(allTripImages);
                          setSelectedGalleryImage(allTripImages[0]);
                        }}
                      >
                        <span className="font-extrabold text-sm tracking-widest -mt-1 text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400">...</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            )}

            {/* AI Summary */}
            {currentTrip.ai_summary && (
              <>
                <hr className="border-slate-900/60" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    AI Summary
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed italic bg-slate-950/20 p-4 rounded-xl border border-slate-900/50">
                    &ldquo;{currentTrip.ai_summary}&rdquo;
                  </p>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ── Right Content Area: Days & Activities ─────────────────────── */}
        <div className="relative lg:col-span-2 space-y-6 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/30 dark:bg-slate-950/20 backdrop-blur-md overflow-hidden min-h-[500px]">
          {/* Background image overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10 pointer-events-none z-0" 
            style={{ backgroundImage: "url('/travel_itinerary.jpg')" }} 
          />
          <div className="relative z-10 space-y-6">
          
          {/* Demo Fallback Banner Warning */}
          {currentTrip.status === 'demo' && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/15 text-amber-300 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block text-sm text-amber-200 mb-1">Demonstration Itinerary Loaded</span>
                This itinerary was loaded as a high-quality demonstration because the AI generation service encountered a temporary timeout. You can review and customize any detail. Saving your changes will automatically promote this to your personal saved itinerary.
              </div>
            </div>
          )}

          {hasDays ? (
            currentTrip.itinerary_days.map((day) => {
              const { text: cleanSummary, imageUrl: dayCoverImage } = extractImageAndText(day.summary, 'day_image');
              return (
                <Card key={day.id} className="p-5 sm:p-6 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/70 backdrop-blur-md shadow-md text-slate-900 dark:text-white">
                  {/* Custom day cover image preview */}
                  {dayCoverImage && (
                    <div className="relative w-full h-36 sm:h-44 overflow-hidden rounded-xl mb-5 shadow-sm border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in duration-300">
                      <img src={dayCoverImage} alt={`Day ${day.day_number} cover`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent animate-in fade-in duration-300" />
                    </div>
                  )}

                  {/* Day Header/Editing */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800/60 pb-4">
                    <div className="flex-1 space-y-2">
                      <Badge variant="indigo" className="mb-1">Day {day.day_number}</Badge>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Day Title</label>
                            <input
                              type="text"
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl px-4 py-2 text-slate-900 dark:text-white font-extrabold text-sm focus:outline-none transition-all"
                              value={day.title}
                              onChange={(e) => handleUpdateDayField(day.id, 'title', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Day Focus Summary</label>
                            <textarea
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl px-4 py-2 text-slate-900 dark:text-white text-xs focus:outline-none transition-all"
                              rows={2}
                              value={cleanSummary}
                              onChange={(e) => {
                                const newSummary = makeImageAndText(e.target.value, dayCoverImage, 'day_image');
                                handleUpdateDayField(day.id, 'summary', newSummary || null);
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDayForImage(day.id);
                              setIsDayCoverModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 dark:bg-slate-950/80 hover:bg-slate-900 dark:hover:bg-slate-950 text-white rounded-xl border border-slate-700/50 shadow-sm transition-all font-bold text-xs"
                          >
                            <Compass className="h-3.5 w-3.5" />
                            <span>{dayCoverImage ? 'Change Day Photo' : 'Upload Day Photo'}</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{day.title}</h3>
                          {cleanSummary && <p className="text-slate-650 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">{cleanSummary}</p>}
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDayForImage(day.id);
                                setIsDayCoverModalOpen(true);
                              }}
                              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 dark:bg-slate-950/80 hover:bg-slate-900 dark:hover:bg-slate-950 text-white rounded-xl border border-slate-700/50 shadow-sm transition-all font-bold text-xs"
                            >
                              <Compass className="h-3.5 w-3.5" />
                              <span>{dayCoverImage ? 'Change Day Photo' : 'Upload Day Photo'}</span>
                            </button>
                          )}
                        </>
                      )}
                  </div>
                  {day.itinerary_date && (
                    <span className="text-xs text-slate-500 whitespace-nowrap self-start bg-slate-950 px-2.5 py-1 border border-slate-900 rounded-lg">
                      {new Date(day.itinerary_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                {/* Day Activities */}
                {day.activities.length === 0 ? (
                  <p className="text-slate-500 text-sm italic pt-4">No activities added for this day.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 border-l border-slate-800 mt-4">
                    {day.activities.map((activity, aIdx) => {
                      const isMorning = activity.start_time ? activity.start_time < '12:00' : false;
                      const isEvening = activity.start_time ? activity.start_time >= '17:00' : false;
                      const badgeVariant = isMorning ? 'amber' : isEvening ? 'indigo' : 'emerald';
                      const cardBorderColor = getCategoryBorder(activity.category);

                      const { text: cleanNotesText, imageUrls: activityImages } = (() => {
                        const notesContent = activity.notes || '';
                        const regex = /\s*\[activity_images\]:# \((.*?)\)/;
                        const match = notesContent.match(regex);
                        const listImages = match ? match[1].split('|||') : [];
                        const finalClean = notesContent.replace(regex, '').trim();
                        return { text: finalClean, imageUrls: listImages };
                      })();

                      return (
                        <div key={activity.id} className="relative group/act">
                          {/* Timeline circle node */}
                          <div className="absolute -left-[32.5px] top-2.5 w-3.5 h-3.5 rounded-full border-4 border-slate-950 bg-indigo-500 group-hover/act:scale-125 transition-transform" />

                          {isEditing ? (
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800 rounded-xl transition-all">
                              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-900 pb-2">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Activity #{aIdx + 1}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Start Time (HH:MM)</label>
                                  <input
                                    type="time"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none transition-all"
                                    value={activity.start_time?.substring(0, 5) || ''}
                                    onChange={(e) => handleUpdateActivityField(day.id, activity.id, 'start_time', e.target.value ? `${e.target.value}:00` : null)}
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Category</label>
                                  <select
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none transition-all"
                                    value={activity.category || ''}
                                    onChange={(e) => handleUpdateActivityField(day.id, activity.id, 'category', e.target.value || null)}
                                  >
                                    <option value="">Select Category</option>
                                    <option value="Culture">🕌 Culture</option>
                                    <option value="Food">🍜 Food</option>
                                    <option value="Nature">🏔️ Nature</option>
                                    <option value="Adventure">🪂 Adventure</option>
                                    <option value="Shopping">🛍️ Shopping</option>
                                    <option value="Nightlife">🍻 Nightlife</option>
                                    <option value="Family">👶 Family</option>
                                    <option value="Relaxation">💆 Relaxation</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Activity Title</label>
                                <input
                                  type="text"
                                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none transition-all"
                                  value={activity.title}
                                  onChange={(e) => handleUpdateActivityField(day.id, activity.id, 'title', e.target.value)}
                                />
                              </div>

                              <div>
                                <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Description</label>
                                <textarea
                                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none transition-all"
                                  rows={2}
                                  value={activity.description || ''}
                                  onChange={(e) => handleUpdateActivityField(day.id, activity.id, 'description', e.target.value || null)}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Location</label>
                                  <input
                                    type="text"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none transition-all"
                                    value={activity.location || ''}
                                    onChange={(e) => handleUpdateActivityField(day.id, activity.id, 'location', e.target.value || null)}
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Estimated Cost</label>
                                  <input
                                    type="text"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none transition-all"
                                    value={activity.estimated_cost || ''}
                                    onChange={(e) => handleUpdateActivityField(day.id, activity.id, 'estimated_cost', e.target.value || null)}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Special Notes / Tips</label>
                                <input
                                  type="text"
                                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none transition-all"
                                  value={cleanNotesText}
                                  onChange={(e) => {
                                    const cleanText = e.target.value || '';
                                    const updatedNotes = activityImages.length > 0
                                      ? `${cleanText}\n\n[activity_images]:# (${activityImages.join('|||')})`.trim()
                                      : cleanText;
                                    handleUpdateActivityField(day.id, activity.id, 'notes', updatedNotes || null);
                                  }}
                                />
                              </div>

                              {/* Activity Photos Edit Section */}
                              <div className="space-y-2 pt-2.5 border-t border-slate-200 dark:border-slate-900">
                                <label className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Activity Photos ({activityImages.length})</label>
                                <div className="flex flex-wrap gap-2 items-center">
                                  {activityImages.map((imgUrl, imgIdx) => (
                                    <div key={imgIdx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50">
                                      <img src={imgUrl} alt={`Activity photo ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = activityImages.filter((_, i) => i !== imgIdx);
                                          handleUpdateActivityImages(day.id, activity.id, updated);
                                        }}
                                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-650/90 hover:bg-red-700 text-white rounded shadow-md transition-all focus:outline-none cursor-pointer"
                                      >
                                        <X className="h-2 w-2" />
                                      </button>
                                    </div>
                                  ))}
                                  <div className="flex gap-1.5">
                                    <label className="flex flex-col items-center justify-center w-12 h-12 border border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 rounded-lg cursor-pointer bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/50 dark:hover:bg-slate-950/60 transition-colors">
                                      <Plus className="h-3.5 w-3.5 mb-0.5 text-indigo-500 dark:text-indigo-400" />
                                      <span className="text-[6px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Drive</span>
                                      <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        multiple 
                                        onChange={async (e) => {
                                          const files = e.target.files;
                                          if (!files) return;
                                          const newImages = [...activityImages];
                                          for (let i = 0; i < files.length; i++) {
                                            try {
                                              const base64 = await compressImage(files[i]);
                                              newImages.push(base64);
                                            } catch (err) {
                                              console.error(err);
                                            }
                                          }
                                          handleUpdateActivityImages(day.id, activity.id, newImages);
                                          e.target.value = '';
                                        }} 
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelfieTarget({ type: 'activity', dayId: day.id, activityId: activity.id });
                                        openCamera();
                                      }}
                                      className="flex flex-col items-center justify-center w-12 h-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-955/40 hover:bg-slate-100/50 dark:hover:bg-slate-950/60 transition-colors cursor-pointer"
                                    >
                                      <Compass className="h-3.5 w-3.5 mb-0.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                                      <span className="text-[6px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Selfie</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Card className="p-4 sm:p-5 transition-all bg-slate-50/70 dark:bg-slate-955/40 hover:bg-slate-100/80 dark:hover:bg-slate-950/80 border border-slate-200 dark:border-slate-800/60 shadow-sm relative z-10">
                              <div className="space-y-1 mb-2.5">
                                <div className="flex flex-wrap gap-2 items-center">
                                  {activity.start_time && (
                                    <Badge variant={badgeVariant} className="flex items-center gap-1.5 w-fit">
                                      <Clock className="h-2.5 w-2.5" />
                                      {activity.start_time.substring(0, 5)}
                                    </Badge>
                                  )}
                                  {activity.category && (
                                    <Badge variant={getCategoryBadgeVariant(activity.category)}>{activity.category}</Badge>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover/act:text-indigo-600 dark:group-hover/act:text-indigo-300 transition-colors">
                                  {aIdx + 1}. {activity.title}
                                </h4>
                              </div>

                              {activity.description && (
                                <p className="text-slate-650 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">{activity.description}</p>
                              )}

                              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-900/60 text-[10px] text-slate-500 font-medium">
                                {activity.location && (
                                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                    <MapPin className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                                    <span>{activity.location}</span>
                                  </span>
                                )}
                                {activity.estimated_cost && (
                                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                                    <span>Estimated Cost: <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{activity.estimated_cost}</span></span>
                                  </span>
                                )}
                                {cleanNotesText && (
                                  <span className="flex items-center gap-1.5 italic text-slate-600 dark:text-slate-400">
                                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                                    <span>{cleanNotesText}</span>
                                  </span>
                                )}
                              </div>

                              {/* Activity Level Photos Row */}
                              {(activityImages.length > 0 || !isOwner) && (
                                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-900/60">
                                  {!isOwner && (
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-2">Activity Photos</span>
                                  )}
                                  <div className="flex flex-wrap gap-2 items-center">
                                    {isOwner ? (
                                      <>
                                        {activityImages.slice(0, 3).map((imgUrl, imgIdx) => (
                                          <div 
                                            key={imgIdx} 
                                            className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:scale-105 active:scale-95 transition-transform shadow-sm cursor-pointer"
                                            onClick={() => {
                                              setGalleryImages(activityImages);
                                              setSelectedGalleryImage(imgUrl);
                                            }}
                                          >
                                            <img src={imgUrl} alt={`Activity photo ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                          </div>
                                        ))}
                                        {activityImages.length > 3 && (
                                          <button
                                            type="button"
                                            className="w-12 h-12 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all hover:scale-105 cursor-pointer"
                                            onClick={() => {
                                              setGalleryImages(activityImages);
                                              setSelectedGalleryImage(activityImages[0]);
                                            }}
                                          >
                                            <span className="font-extrabold text-sm tracking-widest -mt-1 text-slate-550 dark:text-slate-400">...</span>
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {activityImages.map((imgUrl, imgIdx) => (
                                          <div key={imgIdx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 shadow-sm">
                                            <img 
                                              src={imgUrl} 
                                              alt={`Activity photo ${imgIdx + 1}`} 
                                              className="w-full h-full object-cover cursor-pointer" 
                                              onClick={() => {
                                                setGalleryImages(activityImages);
                                                setSelectedGalleryImage(imgUrl);
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = activityImages.filter((_, i) => i !== imgIdx);
                                                handleUpdateActivityImages(day.id, activity.id, updated);
                                              }}
                                              className="absolute top-0.5 right-0.5 p-0.5 bg-red-650/90 hover:bg-red-700 text-white rounded shadow-md transition-all focus:outline-none cursor-pointer"
                                            >
                                              <X className="h-2 w-2" />
                                            </button>
                                          </div>
                                        ))}
                                        <div className="flex gap-1.5 ml-1">
                                          <label className="flex flex-col items-center justify-center w-12 h-12 border border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 rounded-lg cursor-pointer bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/50 dark:hover:bg-slate-950/60 transition-colors">
                                            <Plus className="h-3.5 w-3.5 mb-0.5 text-indigo-500 dark:text-indigo-400" />
                                            <span className="text-[6px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Drive</span>
                                            <input 
                                              type="file" 
                                              className="hidden" 
                                              accept="image/*" 
                                              multiple 
                                              onChange={async (e) => {
                                                const files = e.target.files;
                                                if (!files) return;
                                                const newImages = [...activityImages];
                                                for (let i = 0; i < files.length; i++) {
                                                  try {
                                                    const base64 = await compressImage(files[i]);
                                                    newImages.push(base64);
                                                  } catch (err) {
                                                    console.error(err);
                                                  }
                                                }
                                                handleUpdateActivityImages(day.id, activity.id, newImages);
                                                e.target.value = '';
                                              }} 
                                            />
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelfieTarget({ type: 'activity', dayId: day.id, activityId: activity.id });
                                              openCamera();
                                            }}
                                            className="flex flex-col items-center justify-center w-12 h-12 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100/50 dark:hover:bg-slate-950/60 transition-colors cursor-pointer"
                                          >
                                            <Compass className="h-3.5 w-3.5 mb-0.5 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                                            <span className="text-[6px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Selfie</span>
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Card>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
              );
            })
          ) : (
            <PendingGenerationState
              isConnected={isConnected}
              status={currentTrip.status}
            />
          )}
          </div>
        </div>
      </main>

      {/* Plan Cover Image Picker Modal */}
      <ImagePickerModal
        isOpen={isPlanCoverModalOpen}
        onClose={() => setIsPlanCoverModalOpen(false)}
        title="Select Plan Cover Photo"
        currentImageUrl={planCoverImage}
        onSelect={handleSelectPlanCover}
      />

      {/* Day Cover Image Picker Modal */}
      <ImagePickerModal
        isOpen={isDayCoverModalOpen}
        onClose={() => setIsDayCoverModalOpen(false)}
        title="Select Day Cover Photo"
        currentImageUrl={
          selectedDayForImage 
            ? extractImageAndText(currentTrip.itinerary_days.find(d => d.id === selectedDayForImage)?.summary, 'day_image').imageUrl 
            : null
        }
        onSelect={handleSelectDayCover}
      />

      {/* Dynamic Gallery Popup Window */}
      {galleryImages && selectedGalleryImage && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => {
            setGalleryImages(null);
            setSelectedGalleryImage(null);
          }}
        >
          <div 
            className="relative w-full max-w-5xl h-[80vh] bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden flex shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left side section: 15% width */}
            <div className="w-[15%] min-w-[70px] max-w-[150px] border-r border-slate-800/80 bg-slate-950/40 p-2 sm:p-3 overflow-y-auto flex flex-col gap-2 shrink-0">
              {[...galleryImages].reverse().map((imgUrl, idx) => {
                const isSelected = selectedGalleryImage === imgUrl;
                return (
                  <div
                    key={idx}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                      isSelected 
                        ? 'border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/20' 
                        : 'border border-slate-800/80 hover:border-slate-700'
                    }`}
                    onClick={() => setSelectedGalleryImage(imgUrl)}
                  >
                    <img src={imgUrl} alt={`Gallery thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                );
              })}
            </div>

            {/* Right side section: 85% width, with image fitting into 90% of it */}
            <div className="flex-1 bg-slate-950/20 p-4 sm:p-6 flex items-center justify-center relative">
              <img 
                src={selectedGalleryImage} 
                alt="Selected gallery view" 
                className="max-w-[90%] max-h-[90%] object-contain rounded-xl shadow-lg" 
              />
              <button
                onClick={() => {
                  setGalleryImages(null);
                  setSelectedGalleryImage(null);
                }}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-950 hover:scale-105 rounded-full border border-slate-700 text-white transition-all shadow-md cursor-pointer"
                aria-label="Close gallery popup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

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

// ---------------------------------------------------------------------------
// Static Pending State View Helper
// ---------------------------------------------------------------------------
function PendingGenerationState({
  isConnected,
  status,
}: {
  isConnected: boolean;
  status: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 border border-dashed border-indigo-500/25 rounded-2xl bg-indigo-500/3 text-center space-y-5">
      <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20">
        <Sparkles className="h-10 w-10 text-indigo-400 animate-pulse" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-lg font-bold text-white">Itinerary Not Generated Yet</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          This trip is saved as a <span className="text-amber-400 font-semibold capitalize">{status}</span> draft.
          The day-by-day AI itinerary will appear here after the OpenAI Edge Function generates it.
        </p>
      </div>

      {isConnected ? (
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Trip metadata saved to Supabase · Awaiting Edge Function</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold bg-amber-500/5 px-4 py-2 rounded-xl border border-amber-500/20">
          <Database className="h-4 w-4 shrink-0" />
          <span>DEV FALLBACK: Trip stored locally · Configure Supabase to enable real generation</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image Picker Modal Component
// ---------------------------------------------------------------------------
interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentImageUrl: string | null;
  onSelect: (url: string | null) => void;
}

function ImagePickerModal({ isOpen, onClose, title, currentImageUrl, onSelect }: ImagePickerModalProps) {
  const [customUrl, setCustomUrl] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  if (!isOpen) return null;

  const PRESETS = [
    { name: 'Tropical Beach', url: '/travel_landing.jpg' },
    { name: 'Mountain Lake', url: '/travel_itinerary.jpg' },
    { name: 'Travel Journal', url: '/travel_dashboard_card.jpg' },
    { name: 'Resort Day', url: '/auth_left_light.jpg' },
    { name: 'Resort Night', url: '/auth_left_dark.jpg' },
    { name: 'Group Flight', url: '/auth_bg.jpg' }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setCompressing(true);
    try {
      const base64 = await compressImage(file);
      onSelect(base64);
      onClose();
    } catch (err) {
      setUploadError('Failed to compress and upload image.');
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold tracking-tight mb-4">{title}</h3>

        {/* Current Preview */}
        {currentImageUrl && (
          <div className="mb-5 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Image Preview</span>
            <div className="relative h-32 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <img src={currentImageUrl} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className="absolute top-2 right-2 px-2.5 py-1.5 bg-red-650 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1 border border-red-500/25"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove Cover
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Preset Grid */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Select from Presets</span>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    onSelect(preset.url);
                    onClose();
                  }}
                  className="group relative h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 transition-all text-left w-full"
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-slate-950/40 flex items-end p-1">
                    <span className="text-[9px] text-white font-semibold truncate w-full">{preset.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Local Upload */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Or Upload a Photo</span>
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors">
              <div className="flex flex-col items-center justify-center pt-3 pb-3">
                <Compass className="h-6 w-6 text-slate-400 mb-1" />
                <p className="text-xs text-slate-500"><span className="font-semibold text-indigo-500 dark:text-indigo-400">Click to upload</span> (Auto-optimized)</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={compressing} />
            </label>
            {compressing && <p className="text-xs text-indigo-500 animate-pulse mt-1">Compressing image...</p>}
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
          </div>

          {/* Custom URL */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Or Paste Custom Image URL</span>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/photo.jpg"
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (customUrl.trim()) {
                    onSelect(customUrl.trim());
                    onClose();
                  }
                }}
              >
                Apply Link
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
