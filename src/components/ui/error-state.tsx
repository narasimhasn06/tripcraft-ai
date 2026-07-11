import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = 'An error occurred',
  message,
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col justify-center items-center py-10 px-6 border border-red-500/10 rounded-2xl bg-red-500/5 text-center w-full max-w-md">
      <AlertCircle className="h-10 w-10 text-red-500 mb-3.5" />
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      <p className="text-red-400/80 text-xs mb-5 leading-normal max-w-xs">
        {message}
      </p>
      {action}
    </div>
  );
}
