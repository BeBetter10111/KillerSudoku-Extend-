import { Grid3x3, Loader2, LogIn, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { logIn, signUp } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { Doodles } from '../layout/Doodles';

type AuthMode = 'login' | 'signup';

export function AuthPage() {
  const setSession = useAuthStore((state) => state.setSession);
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  const switchMode = (next: AuthMode): void => {
    setMode(next);
    setError(null);
    setConfirm('');
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (busy) {
      return;
    }
    if (isSignup && password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await (isSignup ? signUp : logIn)(username.trim(), password);
      setSession(session.token, session.username);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const Icon = isSignup ? UserPlus : LogIn;
  const inputClass =
    'mt-1 w-full rounded-xl border-2 border-ink bg-white px-3 py-2 text-lg text-ink outline-none transition-shadow placeholder:text-muted/60 focus:border-cage focus:shadow-[0_0_0_3px_rgba(191,169,220,0.55)]';

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-pale-blush px-4 py-10 text-ink">
      <Doodles />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-lavender shadow-sketch">
            <Grid3x3 className="h-8 w-8 text-ink" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide text-ink sm:text-5xl">Killer Sudoku</h1>
          <p className="mt-2 rounded-xl border-[1.5px] border-ink bg-white px-4 py-1.5 text-lg text-muted">
            ☆ Log in to save your progress and continue your games.
          </p>
        </div>

        <div className="sketch-card p-6 shadow-sketch-lg sm:p-8">
          <div
            role="tablist"
            aria-label="Account"
            className="grid grid-cols-2 gap-2 rounded-full border-2 border-ink bg-pale-blush p-1"
          >
            {(['login', 'signup'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={`rounded-full px-3 py-1.5 text-lg font-bold transition-colors ${
                  mode === value ? 'border-2 border-ink bg-lavender text-ink shadow-sketch-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {value === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={(event) => void submit(event)} className="mt-6 flex flex-col gap-4">
            <label className="block text-lg text-ink">
              Username
              <input
                type="text"
                value={username}
                required
                minLength={3}
                maxLength={20}
                autoComplete="username"
                placeholder="your name"
                onChange={(event) => setUsername(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-lg text-ink">
              Password
              <input
                type="password"
                value={password}
                required
                minLength={6}
                maxLength={72}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder="at least 6 characters"
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
            </label>
            {isSignup && (
              <label className="block text-lg text-ink">
                Confirm password
                <input
                  type="password"
                  value={confirm}
                  required
                  autoComplete="new-password"
                  onChange={(event) => setConfirm(event.target.value)}
                  className={inputClass}
                />
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-xl border-[1.5px] border-crimson bg-blush px-3 py-2 text-crimson">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="sketch-btn-primary mt-1 flex items-center justify-center gap-2 px-6 py-3 text-xl"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
              {isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-5 border-t border-dashed border-ink/30 pt-4 text-center text-muted">
            {isSignup ? 'Already have an account? ' : 'New here? '}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              className="font-bold text-cage underline decoration-wavy decoration-lavender underline-offset-4 hover:text-ink"
            >
              {isSignup ? 'Log in instead' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
