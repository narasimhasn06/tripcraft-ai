'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900/50 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center cursor-pointer shrink-0"
      aria-label="Toggle Theme"
      type="button"
    >
      {theme === 'dark' ? (
        <Sun className="h-4.5 w-4.5 text-amber-400 shrink-0" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
      )}
    </button>
  );
}
