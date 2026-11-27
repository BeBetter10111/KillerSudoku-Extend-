import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { logIn, signUp } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
        <h1 className="text-center text-3xl font-extrabold tracking-tight">Killer Sudoku</h1>
        <p className="mt-1 text-center text-sm text-slate-400">Log in to save your progress and continue your games.</p>

        <div role="tablist" aria-label="Account" className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-900/60 p-1">
          {(['login', 'signup'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                mode === value ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {value === 'login' ? 'Log in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={(event) => void submit(event)} className="mt-5 flex flex-col gap-4">
          <label className="block text-sm text-slate-300">
            Username
            <input
              type="text"
              value={username}
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-400"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Password
            <input
              type="password"
              value={password}
              required
              minLength={6}
              maxLength={72}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-400"
            />
          </label>
          {isSignup && (
            <label className="block text-sm text-slate-300">
              Confirm password
              <input
                type="password"
                value={confirm}
                required
                autoComplete="new-password"
                onChange={(event) => setConfirm(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-400"
              />
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 font-bold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
            {isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>
      </div>
    </main>
  );
}
