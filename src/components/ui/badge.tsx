import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'indigo' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate';
}

export function Badge({ className = '', variant = 'slate', children, ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border';

  const variants = {
    indigo: 'bg-indigo-500/10 border-indigo-500/15 text-indigo-300',
    emerald: 'bg-emerald-500/10 border-emerald-500/15 text-emerald-300',
    cyan: 'bg-cyan-500/10 border-cyan-500/15 text-cyan-300',
    amber: 'bg-amber-500/10 border-amber-500/15 text-amber-300',
    rose: 'bg-rose-500/10 border-rose-500/15 text-rose-350',
    slate: 'bg-slate-900 border-slate-800 text-slate-300',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}
