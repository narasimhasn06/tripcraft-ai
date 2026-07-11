import React, { forwardRef, useId } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, id, rows = 3, ...props }, ref) => {
    const defaultId = useId();
    const textareaId = id || defaultId;
    const errorId = `${textareaId}-error`;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full rounded-xl bg-white/90 dark:bg-slate-950/80 border text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm px-4 py-2.5 resize-none ${
            error ? 'border-red-500/50 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500'
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-red-400 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
