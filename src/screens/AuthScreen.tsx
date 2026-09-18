import { useState } from 'react';
import { LogIn, UserPlus, ShieldCheck, Chrome } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AuthScreen() {
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!email.trim() || password.length < 6) {
      setMessage('Enter a valid email and a password with at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const result = await signIn(email, password);
        if (result.error) setMessage(result.error.message);
      } else {
        const result = await signUp(email, password);
        if (result.error) setMessage(result.error.message);
        else if (result.needsEmailConfirmation) setMessage('Account created. Check your email to confirm your account, then sign in.');
        else setMessage('Account created successfully.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-aerqvon-bg px-5 py-10 text-aerqvon-text">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-aerqvon-primary/15 text-aerqvon-primary">
            <ShieldCheck size={34} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AERQVON</h1>
          <p className="mt-2 text-sm text-aerqvon-muted">Secure crypto wallet & spot trading</p>
        </div>

        <div className="card p-5">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-black/10 p-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setMessage(''); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === 'signin' ? 'bg-white/10 text-aerqvon-text' : 'text-aerqvon-muted'}`}
            >
              <LogIn className="mr-2 inline" size={16} /> Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setMessage(''); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-white/10 text-aerqvon-text' : 'text-aerqvon-muted'}`}
            >
              <UserPlus className="mr-2 inline" size={16} /> Create account
            </button>
          </div>

            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMessage('');
                try {
                  const result = await signInWithGoogle();
                  if (result.error) setMessage(result.error.message);
                } finally {
                  setBusy(false);
                }
              }}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-aerqvon-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Chrome size={18} /> Continue with Google
            </button>

            <div className="mb-4 flex items-center gap-3 text-xs text-aerqvon-dim">
              <span className="h-px flex-1 bg-white/10" />
              <span>or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-aerqvon-muted">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-aerqvon-primary"
                placeholder="you@example.com"
                disabled={busy}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-aerqvon-muted">Password</span>
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-aerqvon-primary"
                placeholder="At least 6 characters"
                disabled={busy}
              />
            </label>

            {message && (
              <div className="rounded-xl bg-white/5 px-4 py-3 text-sm text-aerqvon-muted">{message}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-aerqvon-primary px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in to AERQVON' : 'Create AERQVON account'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-aerqvon-muted">
          Your trading data is protected by Supabase Auth and database row-level security.
        </p>
      </div>
    </div>
  );
}
