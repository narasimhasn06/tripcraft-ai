import React from 'react';
import { Compass } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'No records found',
  description = 'You have not added any items yet.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col justify-center items-center py-16 px-6 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 backdrop-blur-sm text-center w-full">
      <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-400 mb-4 animate-pulse">
        {icon || <Compass className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-bold text-white mb-1.5">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
}
