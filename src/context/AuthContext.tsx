import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getCurrentSession, onAuthStateChange, signInWithGoogle, signInWithPassword, signOut, signUpWithPassword } from '@/services/authService';
import { getAqvUserId } from '@/services/aqvUserService';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  aqvUserId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
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
  const [aqvUserId, setAqvUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    getCurrentSession()
      .then(async (currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        if (currentSession?.user) {
          try {
            const id = await getAqvUserId(currentSession.user.id);
            if (mounted) setAqvUserId(id);
          } catch (error) {
            console.error('Failed to load AERQVON user ID:', error);
          }
        } else {
          setAqvUserId(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      subscription = onAuthStateChange((nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        if (!nextSession?.user) {
          setAqvUserId(null);
          return;
        }
        void getAqvUserId(nextSession.user.id)
          .then((id) => {
            if (mounted) setAqvUserId(id);
          })
          .catch((error) => {
            console.error('Failed to load AERQVON user ID:', error);
          });
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
    aqvUserId,
    signIn: async (email, password) => {
      const { error } = await signInWithPassword(email, password);
      return { error: normalizeError(error) };
    },
    signInWithGoogle: async () => {
      const { error } = await signInWithGoogle();
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
  }), [session, loading, aqvUserId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
