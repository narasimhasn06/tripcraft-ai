'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Compass, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle').then((m) => m.ThemeToggle), {
  ssr: false,
  loading: () => <div className="p-2 h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0" />
});

const GoogleIcon = () => (
  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function AuthPage() {
  const [view, setView] = useState<'signin' | 'signup' | 'forgot_password' | 'update_password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const { signIn, signUp, isConnected } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v === 'update_password') {
      const timer = setTimeout(() => {
        setView('update_password');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (view === 'forgot_password') {
      if (!email) {
        setError('Please enter your email address.');
        return;
      }
      setLoading(true);
      try {
        if (isConnected) {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?type=recovery`
          });
          if (error) throw error;
        }
        setMessage('Password reset link sent! Please check your email.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send reset link.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (view === 'update_password') {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        if (isConnected) {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
        }
        setMessage('Password updated successfully! Redirecting...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update password.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      if (view === 'signup') {
        await signUp(email, password);
        if (isConnected) {
          setMessage('Account registration completed! Please check your email for the confirmation link.');
        } else {
          setMessage('Mock account registered successfully! Redirecting...');
        }
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      let errMsg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      const lowMsg = errMsg.toLowerCase();
      if (
        lowMsg.includes('rate limit') || 
        lowMsg.includes('email limit') || 
        lowMsg.includes('security purposes') || 
        lowMsg.includes('otp_limit')
      ) {
        errMsg = 'Signup email rate limit exceeded. Please wait a few minutes, or use the pre-configured test account. Alternatively, toggle "Confirm email" OFF in your Supabase Auth Settings to bypass email confirmation.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isConnected) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) throw error;
      } else {
        // Mock login
        const mockUser = { id: 'google-user-id', email: 'googleuser@gmail.com' };
        localStorage.setItem('togethr_session', JSON.stringify({ access_token: 'mock-google', user: mockUser }));
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Google login.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Left Column: Auth form */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden lg:w-1/2">
        {/* Background neon glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl z-0" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl z-0" />

        <div className="w-full max-w-md space-y-8 z-10">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-between mb-4">
              <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white group">
                <Compass className="h-8 w-8 text-indigo-400 group-hover:rotate-45 transition-transform duration-300" />
                <span>togethr</span>
              </Link>
              <ThemeToggle />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {view === 'signup' && 'Create your account'}
              {view === 'signin' && 'Sign in to your account'}
              {view === 'forgot_password' && 'Reset your password'}
              {view === 'update_password' && 'Set new password'}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {view === 'signin' && (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => {
                      setView('signup');
                      setError(null);
                      setMessage(null);
                    }}
                    className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              )}
              {view === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setView('signin');
                      setError(null);
                      setMessage(null);
                    }}
                    className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                  >
                    Sign In
                  </button>
                </>
              )}
              {view === 'forgot_password' && (
                <>
                  Remembered your password?{' '}
                  <button
                    onClick={() => {
                      setView('signin');
                      setError(null);
                      setMessage(null);
                    }}
                    className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                  >
                    Sign In
                  </button>
                </>
              )}
              {view === 'update_password' && 'Enter your new password below'}
            </p>
          </div>

          {/* Card Component */}
          <Card className="p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl">
                  <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              {view !== 'update_password' && (
                <Input
                  id="email"
                  label="Email Address"
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                />
              )}

              {view !== 'forgot_password' && (
                <Input
                  id="password"
                  label={view === 'update_password' ? 'New Password' : 'Password'}
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                />
              )}

              {view === 'update_password' && (
                <Input
                  id="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  required
                  disabled={loading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<Lock className="h-4 w-4" />}
                />
              )}

              {view === 'signin' && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot_password');
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full py-3"
                isLoading={loading}
              >
                {view === 'signin' && 'Sign In'}
                {view === 'signup' && 'Create Account'}
                {view === 'forgot_password' && 'Send Reset Link'}
                {view === 'update_password' && 'Update Password'}
              </Button>

              {(view === 'signin' || view === 'signup') && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-50 dark:bg-slate-900 px-2 text-slate-500">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    className="w-full py-3 hover:-translate-y-0.5 active:translate-y-0 transition-all border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
                    isLoading={loading}
                    leftIcon={<GoogleIcon />}
                  >
                    Continue with Google
                  </Button>
                </>
              )}
            </form>
          </Card>
        </div>
      </div>

      {/* Right Column: Visual Hero (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-100 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
        {/* Full-bleed background image */}
        <img
          src="/auth_bg.jpg"
          alt="Travel team members"
          className="absolute inset-0 w-full h-full object-cover opacity-85 dark:opacity-40 transition-opacity duration-300"
        />
        {/* Abstract overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-200/50 via-slate-100/10 to-transparent dark:from-slate-950 dark:via-slate-955/40 dark:to-transparent" />
        <div className="absolute top-12 left-12 right-12 flex items-center justify-between z-20">
          <Link href="/" className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-lg">
            <Compass className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>togethr</span>
          </Link>
          <span className="text-xs uppercase bg-indigo-50 dark:bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-indigo-750 dark:text-indigo-200 border border-indigo-100 dark:border-white/10 font-semibold tracking-wider">
            Premium Travel
          </span>
        </div>

        {/* Hero typography and Testimonial Overlay Card inside a curved card floating at the bottom */}
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <div className="w-full max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Typography Section */}
            <div className="flex-1 space-y-1.5 text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                Create stories, not itineraries.
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] md:text-xs leading-relaxed max-w-lg">
                Join thousands of travelers who craft daily bespoke experiences and discover hidden local gems with our AI planner.
              </p>
            </div>

            {/* Testimonial Glass Card */}
            <div className="w-full md:w-auto bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/40 dark:border-white/10 rounded-xl p-3 flex items-start gap-3 shrink-0 max-w-md">
              <img
                src="/traveler_avatar.png"
                alt="Sarah Jenkins profile"
                className="h-9 w-9 rounded-full object-cover border border-indigo-200 dark:border-indigo-400/50 shadow-sm shrink-0"
              />
              <div className="space-y-0.5 flex-1">
                <p className="text-[10px] italic text-slate-750 dark:text-slate-100 leading-normal">
                  &ldquo;togethr planned my 10-day trip to Tokyo in seconds. The choice of restaurants and daily pacing was absolutely perfect!&rdquo;
                </p>
                <div className="flex items-center justify-between gap-4 pt-0.5">
                  <div>
                    <h5 className="text-[9px] font-bold text-slate-900 dark:text-white">Sarah Jenkins</h5>
                    <p className="text-[7px] text-slate-500 dark:text-slate-400">Globetrotter & Blogger</p>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-500 dark:text-amber-400">
                    {/* 5-star rating */}
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-2.5 w-2.5 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
