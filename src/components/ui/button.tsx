import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-indigo-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    // Variant styles
    const variants = {
      primary: 'bg-indigo-650 hover:bg-indigo-550 text-white shadow-lg shadow-indigo-650/10',
      secondary: 'bg-emerald-650 hover:bg-emerald-550 text-white shadow-lg shadow-emerald-650/10',
      outline: 'bg-transparent border border-slate-800 hover:bg-slate-900/50 hover:border-slate-700 text-slate-300 hover:text-white',
      ghost: 'bg-transparent hover:bg-slate-900/40 text-slate-400 hover:text-white',
      danger: 'bg-red-950/40 border border-red-900/40 hover:bg-red-900/20 text-red-400 hover:text-red-300',
    };

    // Size styles
    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4.5 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3.5 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
