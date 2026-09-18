import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { config } from '@/config';

let client: SupabaseClient | null = null;

export function getSupabaseConfigurationError(): Error | null {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return new Error(
      'Supabase authentication is not configured. Contact support if this persists.',
    );
  }

  return null;
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const configurationError = getSupabaseConfigurationError();
  if (configurationError) throw configurationError;

  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error) return null;
  return data.user;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session;
}

export async function signInWithPassword(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
}

export async function signUpWithPassword(email: string, password: string) {
  return getSupabaseClient().auth.signUp({
    email: email.trim(),
    password,
  });
}

export async function signInWithGoogle() {
  return getSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
}

export async function signOut() {
  return getSupabaseClient().auth.signOut();
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
) {
  return getSupabaseClient().auth.onAuthStateChange((_event, session) =>
    callback(session),
  );
}
