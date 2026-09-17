import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getCurrentSession, onAuthStateChange, signInWithPassword, signOut, signUpWithPassword } from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeError(error: unknown): Error | null {
  return error instanceof Error ? error : error ? new Error(String(error)) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getCurrentSession()
      .then((currentSession) => {
        if (mounted) setSession(currentSession);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      subscription = onAuthStateChange((nextSession) => {
        if (mounted) setSession(nextSession);
      }).data.subscription;
    } catch (error) {
      console.error('Failed to initialize Supabase auth listener:', error);
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    signIn: async (email, password) => {
      const { error } = await signInWithPassword(email, password);
      return { error: normalizeError(error) };
    },
    signUp: async (email, password) => {
      const { data, error } = await signUpWithPassword(email, password);
      return {
        error: normalizeError(error),
        needsEmailConfirmation: !error && !data.session,
      };
    },
    signOut: async () => {
      const { error } = await signOut();
      return { error: normalizeError(error) };
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
