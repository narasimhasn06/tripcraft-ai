import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  type?: 'card' | 'list' | 'fullscreen';
}

export function LoadingState({ message = 'Loading...', type = 'list' }: LoadingStateProps) {
  if (type === 'fullscreen') {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-white min-h-screen">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">{message}</p>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="border border-slate-900 bg-slate-900/10 rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-800 rounded w-5/6" />
          <div className="h-4 bg-slate-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full py-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm">{message}</p>
      </div>
      <div className="space-y-3">
        <div className="h-10 bg-slate-900/40 rounded-xl border border-slate-850 animate-pulse w-full" />
        <div className="h-10 bg-slate-900/40 rounded-xl border border-slate-850 animate-pulse w-5/6" />
        <div className="h-10 bg-slate-900/40 rounded-xl border border-slate-850 animate-pulse w-4/5" />
      </div>
    </div>
  );
}
