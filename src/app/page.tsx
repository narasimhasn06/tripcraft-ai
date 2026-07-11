'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Compass, ArrowRight, Sparkles, MapPin, 
  Clock, DollarSign, Globe
} from 'lucide-react';
import dynamic from 'next/dynamic';
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle').then((m) => m.ThemeToggle), {
  ssr: false,
  loading: () => <div className="p-2 h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0" />
});

// Static 京都 (Kyoto) Itinerary for showcase
const SAMPLE_ITINERARY = {
  title: "3-Day Zen & Serenity in Kyoto",
  destination: "Kyoto, Japan",
  days: [
    {
      day_number: 1,
      theme: "Zen Gardens & Bamboo Whispers",
      activities: [
        {
          time_of_day: "Morning",
          title: "Arashiyama Bamboo Grove",
          description: "Stroll through towering stalks of bamboo as the early sunlight filters down. A quiet, spiritual start to your Kyoto journey.",
          location: "Arashiyama, Kyoto",
          duration: "1.5 hours",
          cost_estimate: "Free"
        },
        {
          time_of_day: "Afternoon",
          title: "Tenryu-ji Temple Gardens",
          description: "Explore the stunning 14th-century Zen garden, featuring a central pond reflecting the surrounding maple-clad mountains.",
          location: "Tenryu-ji, Ukyo Ward",
          duration: "2 hours",
          cost_estimate: "¥500"
        },
        {
          time_of_day: "Evening",
          title: "Tea Ceremony at Jotokuji Temple",
          description: "Experience the mindful art of Japanese tea preparation. Sip freshly whisked matcha served with traditional sweets.",
          location: "Jotokuji Temple, Shimogyo Ward",
          duration: "1 hour",
          cost_estimate: "¥3,000"
        }
      ]
    },
    {
      day_number: 2,
      theme: "Gold Leaf & Historic Pathways",
      activities: [
        {
          time_of_day: "Morning",
          title: "Kinkaku-ji (The Golden Pavilion)",
          description: "Marvel at the top two floors completely covered in gold leaf, standing majestically over a shimmering mirror pond.",
          location: "Kita Ward, Kyoto",
          duration: "1.5 hours",
          cost_estimate: "¥400"
        },
        {
          time_of_day: "Afternoon",
          title: "Stroll through Higashiyama",
          description: "Walk down preserved historic streets filled with wooden merchant homes, artisan shops, and traditional sweet houses.",
          location: "Higashiyama District",
          duration: "3 hours",
          cost_estimate: "Free"
        },
        {
          time_of_day: "Evening",
          title: "Gion Kaiseki Dinner",
          description: "Savor a multi-course seasonal culinary masterpiece, showcasing delicate local flavors and exquisite presentation.",
          location: "Gion District",
          duration: "2 hours",
          cost_estimate: "¥8,000"
        }
      ]
    }
  ]
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [activeDay, setActiveDay] = useState(0);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors duration-300">
      {/* Travel-related background image with light/dark adaptive opacities */}
      <img
        src="/travel_landing.jpg"
        alt="Travel beach sunset walk"
        className="absolute top-0 left-0 w-full h-[800px] object-cover opacity-45 dark:opacity-15 mix-blend-normal pointer-events-none z-0"
      />
      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-transparent via-slate-50 to-slate-50 dark:via-slate-950 dark:to-slate-950 pointer-events-none z-0" />

      {/* Calm Aspirational Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[700px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between z-50 border-b border-slate-200/50 dark:border-slate-900/50 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl sticky top-0">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white group" aria-label="togethr Home">
          <Compass className="h-6.5 w-6.5 text-indigo-400 group-hover:rotate-45 transition-transform duration-350" />
          <span>togethr</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {loading ? (
            <div className="h-10 w-24 bg-slate-900 animate-pulse rounded-xl" />
          ) : user ? (
            <Link href="/dashboard">
              <Button size="sm" className="hover:-translate-y-0.5 transition-all shadow-md active:translate-y-0" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/auth">
              <Button size="sm" className="hover:-translate-y-0.5 transition-all shadow-md active:translate-y-0" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center justify-center text-center mt-12 sm:mt-20 z-10">
        
        {/* Sub-headline pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-300 rounded-full text-xs font-semibold mb-6 animate-pulse" style={{ animationDuration: '3s' }}>
          <Sparkles className="h-3.5 w-3.5 text-indigo-400 dark:text-indigo-400" />
          <span>Custom Daily Itineraries in Seconds</span>
        </div>

        {/* Emotional travel-planning headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl leading-[1.1] sm:leading-none">
          Escape the Planning. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 dark:from-indigo-300 dark:via-purple-300 dark:to-emerald-300 bg-clip-text text-transparent">Embrace the Journey.</span>
        </h1>

        {/* Brief product explanation */}
        <p className="text-slate-600 dark:text-slate-400 mt-6 text-base sm:text-lg max-w-2xl leading-relaxed">
          togethr eliminates the fatigue of logistics. Simply describe your ideal vacation, choose your pace, and let our intelligence generate a detailed, edit-ready daily itinerary designed around you.
        </p>

        {/* “Plan My Trip” CTA */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href={user ? "/dashboard" : "/auth"} className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5 transition-all" rightIcon={<ArrowRight className="h-4.5 w-4.5" />}>
              Plan My Trip
            </Button>
          </Link>
          <a href="#preview" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto hover:-translate-y-0.5 transition-all">
              Explore Demo Itinerary
            </Button>
          </a>
        </div>

        {/* Core Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-24 text-left px-4">
          <Card className="p-6 hover:border-indigo-500/20 transition-all duration-300">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 w-fit mb-4">
              <Sparkles className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">AI-Powered Curation</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Advanced algorithms analyze your budget, pace, and interests to build a perfectly balanced day-by-day itinerary.
            </p>
          </Card>
          <Card className="p-6 hover:border-purple-500/20 transition-all duration-300">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400 w-fit mb-4">
              <Compass className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Interactive Customization</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Every detail is editable. Tweak activities, adjust times, modify locations, and save changes to the cloud.
            </p>
          </Card>
          <Card className="p-6 hover:border-emerald-500/20 transition-all duration-300">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 w-fit mb-4">
              <Globe className="h-5.5 w-5.5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Pace & Budget Controls</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Choose between budget, standard, or premium comfort plans, and set travel pacing from relaxed to action-packed.
            </p>
          </Card>
        </section>

        {/* Static Sample Itinerary Preview Section */}
        <section id="preview" className="w-full max-w-4xl mt-24 sm:mt-32 text-left space-y-6 scroll-mt-24 mb-24 px-4">
          <div className="text-center max-w-lg mx-auto space-y-2 mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Curated Sample Plan</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Here is a demonstration Kyoto itinerary tailored to a relaxed, culture-focused travel style.
            </p>
          </div>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/3 via-transparent to-emerald-500/3 pointer-events-none" />
            
            {/* Kyoto Preview Title */}
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/50 gap-4">
              <div>
                <Badge variant="indigo" className="mb-2 uppercase tracking-wide text-[10px]">Sample Plan</Badge>
                <CardTitle className="text-2xl font-extrabold">{SAMPLE_ITINERARY.title}</CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span className="font-medium">{SAMPLE_ITINERARY.destination}</span>
                </div>
              </div>

              {/* Day selection tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
                {SAMPLE_ITINERARY.days.map((day, idx) => (
                  <button
                    key={day.day_number}
                    onClick={() => setActiveDay(idx)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                      activeDay === idx 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    Day {day.day_number}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="mt-6 space-y-6">
              {/* Daily Focus theme block */}
              <div className="p-4 bg-slate-100/65 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-xl flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Day Focus Theme
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-normal">
                    {SAMPLE_ITINERARY.days[activeDay].theme}
                  </span>
                </div>
              </div>

              {/* Day activities timeline */}
              <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-8 mt-4">
                {SAMPLE_ITINERARY.days[activeDay].activities.map((activity, actIdx) => {
                  const isMorning = activity.time_of_day === 'Morning';
                  const isEvening = activity.time_of_day === 'Evening';
                  const badgeVariant = isMorning ? 'amber' : isEvening ? 'indigo' : 'emerald';

                  return (
                    <div key={actIdx} className="relative group">
                      {/* Timeline circle node */}
                      <div className="absolute -left-[32.5px] top-1.5 w-3.5 h-3.5 rounded-full border-4 border-slate-50 dark:border-slate-950 bg-indigo-500 group-hover:scale-125 transition-transform" />

                      <div className="bg-white/50 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-950/50 border border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800 rounded-xl p-5 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                          <div className="space-y-1.5">
                            <Badge variant={badgeVariant}>{activity.time_of_day}</Badge>
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">{activity.title}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {activity.description}
                            </p>
                          </div>
                          
                          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 shrink-0 self-start sm:self-auto bg-slate-100/40 dark:bg-slate-950/40 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-900/40">
                            <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{activity.location}</span>
                          </div>
                        </div>

                        <div className="flex gap-4 mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-900/60 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                            {activity.duration}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                            Cost: {activity.cost_estimate}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-8 z-10 bg-slate-100/60 dark:bg-slate-950/60">
        <div className="max-w-7xl w-full mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span>© 2026 togethr. Designed for serene travel planning.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-350 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-350 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-350 transition-colors flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              <span>English</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
