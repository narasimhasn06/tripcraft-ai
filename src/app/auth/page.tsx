'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Compass, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const { signIn, signUp, isConnected } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
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
      setError(err instanceof Error ? err.message : 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden bg-slate-950 min-h-screen">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-white mb-4 group">
            <Compass className="h-8 w-8 text-indigo-400 group-hover:rotate-45 transition-transform duration-300" />
            <span>TripCraft <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">AI</span></span>
          </Link>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        {/* Card Component */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
                <CheckCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{message}</span>
              </div>
            )}

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

            <Input
              id="password"
              label="Password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="h-4 w-4" />}
            />

            <Button
              type="submit"
              className="w-full py-3"
              isLoading={loading}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
