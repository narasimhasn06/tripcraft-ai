import React, { forwardRef, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, id, ...props }, ref) => {
    const defaultId = useId();
    const selectId = id || defaultId;
    const errorId = `${selectId}-error`;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-slate-350 tracking-wide">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full rounded-xl bg-slate-950/85 border text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm px-4 py-2.5 ${
            error ? 'border-red-500/50 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-200">
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="text-xs text-red-400 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
