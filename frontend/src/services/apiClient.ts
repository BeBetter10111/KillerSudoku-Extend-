import type {
  BenchmarkRequest,
  BenchmarkResultDTO,
  AuthResponse,
  DailySeedResponse,
  Difficulty,
  GameMode,
  LeaderboardEntry,
  MeResponse,
} from '../types/game';

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '';

export const MIN_BENCHMARK_BATCH_SIZE = 1;
export const MAX_BENCHMARK_BATCH_SIZE = 1000;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface LeaderboardQuery {
  date?: string;
  mode?: GameMode;
  difficulty?: Difficulty;
  limit?: number;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchDailySeed(signal?: AbortSignal): Promise<DailySeedResponse> {
  return getJson<DailySeedResponse>('/api/daily-seed', signal);
}

export async function fetchLeaderboard(
  query: LeaderboardQuery = {},
  signal?: AbortSignal,
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams();
  if (query.date) {
    params.set('date', query.date);
  }
  if (query.mode) {
    params.set('mode', query.mode);
  }
  if (query.difficulty) {
    params.set('difficulty', query.difficulty);
  }
  if (query.limit !== undefined) {
    params.set('limit', String(query.limit));
  }
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : '';
  return getJson<LeaderboardEntry[]>(`/api/leaderboard${suffix}`, signal);
}

const BENCHMARK_ERRORS: Record<number, string> = {
  400: 'The benchmark request was rejected by the server',
  429: 'A benchmark is already running, try again in a moment',
};

export async function runAlgorithmBenchmark(
  batchSize: number,
  difficulty: Difficulty,
  signal?: AbortSignal,
): Promise<BenchmarkResultDTO> {
  if (
    !Number.isInteger(batchSize) ||
    batchSize < MIN_BENCHMARK_BATCH_SIZE ||
    batchSize > MAX_BENCHMARK_BATCH_SIZE
  ) {
    throw new RangeError(
      `batchSize must be an integer between ${MIN_BENCHMARK_BATCH_SIZE} and ${MAX_BENCHMARK_BATCH_SIZE}`,
    );
  }
  const body: BenchmarkRequest = { difficulty, batchSize };
  const response = await fetch(`${API_BASE_URL}/api/benchmark/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      BENCHMARK_ERRORS[response.status] ?? `Benchmark failed with status ${response.status}`,
    );
  }
  return (await response.json()) as BenchmarkResultDTO;
}

async function serverMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === 'string' && body.message ? body.message : fallback;
  } catch {
    return fallback;
  }
}

async function authRequest(
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  token: string | null,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the game server');
  }
}

async function authenticate(path: string, username: string, password: string): Promise<AuthResponse> {
  const response = await authRequest(path, 'POST', null, { username, password });
  if (!response.ok) {
    throw new ApiError(response.status, await serverMessage(response, `Request failed with status ${response.status}`));
  }
  return (await response.json()) as AuthResponse;
}

export function signUp(username: string, password: string): Promise<AuthResponse> {
  return authenticate('/api/auth/signup', username, password);
}

export function logIn(username: string, password: string): Promise<AuthResponse> {
  return authenticate('/api/auth/login', username, password);
}

export async function logOut(token: string): Promise<void> {
  await authRequest('/api/auth/logout', 'POST', token).catch(() => undefined);
}

export async function fetchMe(token: string): Promise<MeResponse> {
  const response = await authRequest('/api/me', 'GET', token);
  if (!response.ok) {
    throw new ApiError(response.status, `Could not load your profile (status ${response.status})`);
  }
  return (await response.json()) as MeResponse;
}

export async function discardActiveGame(token: string): Promise<void> {
  const response = await authRequest('/api/game/active', 'DELETE', token);
  if (!response.ok) {
    throw new ApiError(response.status, `Could not discard the saved game (status ${response.status})`);
  }
}
