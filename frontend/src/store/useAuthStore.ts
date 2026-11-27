import { create } from 'zustand';

const STORAGE_KEY = 'killer-sudoku:auth';

interface StoredAuth {
  token: string;
  username: string;
}

function load(): StoredAuth | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    return typeof parsed.token === 'string' && typeof parsed.username === 'string'
      ? { token: parsed.token, username: parsed.username }
      : null;
  } catch {
    return null;
  }
}

function persist(auth: StoredAuth | null): void {
  try {
    if (auth) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // storage unavailable: the session just won't survive a reload
  }
}

interface AuthState {
  token: string | null;
  username: string | null;
  setSession: (token: string, username: string) => void;
  clearSession: () => void;
}

const initial = load();

export const useAuthStore = create<AuthState>((set) => ({
  token: initial?.token ?? null,
  username: initial?.username ?? null,
  setSession: (token, username) => {
    persist({ token, username });
    set({ token, username });
  },
  clearSession: () => {
    persist(null);
    set({ token: null, username: null });
  },
}));
