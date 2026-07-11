'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isSupabaseConfigured } from '@/lib/supabaseConnection';
import { Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
}

export interface UserSession {
  access_token: string;
  user: UserProfile;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | UserSession | null;
  loading: boolean;
  isConnected: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isConnected: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const isConnected = isSupabaseConfigured();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isConnected) {
      // 1. LIVE SUPABASE MODE
      const getInitialSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setSession(session);
            setUser({
              id: session.user.id,
              email: session.user.email || '',
            });
          }
        } catch (error) {
          console.error('Failed to retrieve Supabase session:', error);
        } finally {
          setLoading(false);
        }
      };

      getInitialSession();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (session) {
            setSession(session);
            setUser({
              id: session.user.id,
              email: session.user.email || '',
            });
            if (event === 'PASSWORD_RECOVERY') {
              router.push('/auth?view=update_password');
            }
          } else {
            setSession(null);
            setUser(null);
          }
          setLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // 2. FALLBACK MOCK MODE
      const timer = setTimeout(() => {
        try {
          const storedSession = localStorage.getItem('togethr_session');
          if (storedSession) {
            const parsed = JSON.parse(storedSession) as UserSession;
            setSession(parsed);
            setUser(parsed.user);
          }
        } catch (error) {
          console.error('Failed to load mock session from localStorage:', error);
        } finally {
          setLoading(false);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // Route protection
  useEffect(() => {
    if (loading) return;

    const publicRoutes = ['/', '/auth'];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user && !isPublicRoute) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
    } else if (user && pathname === '/auth') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view === 'update_password') {
        return; // Allow stay on /auth to update password
      }
      const nextParam = params.get('next');
      router.push(nextParam ? decodeURIComponent(nextParam) : '/dashboard');
    }
  }, [user, loading, pathname, router]);

  const signIn = async (email: string, password?: string) => {
    if (isConnected) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: password || '',
      });
      if (error) throw error;
    } else {
      // Mock flow
      const mockUser: UserProfile = {
        id: Math.random().toString(36).substring(2, 9),
        email: email,
      };
      const mockSession: UserSession = {
        access_token: 'mock-jwt-token-xyz',
        user: mockUser,
      };

      localStorage.setItem('togethr_session', JSON.stringify(mockSession));
      setSession(mockSession);
      setUser(mockUser);
    }
  };

  const signUp = async (email: string, password?: string) => {
    if (isConnected) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || '',
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      
      // If auto-confirm is enabled or session is immediately returned
      if (data.session) {
        setSession(data.session);
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
        });
      }
    } else {
      // Mock flow
      await signIn(email, password);
    }
  };

  const signOut = async () => {
    if (isConnected) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('togethr_session');
      setSession(null);
      setUser(null);
    }
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isConnected, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
