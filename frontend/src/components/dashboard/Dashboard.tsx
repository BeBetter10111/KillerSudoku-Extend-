import { Bot, CalendarDays, Cpu, FlaskConical, Gamepad2, Grid3x3, Layers, Loader2, Lock, LogOut, Play, RotateCcw, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchDailySeed } from '../../services/apiClient';
import {
  DEFAULT_SOLVER_STRATEGY,
  type DailySeedResponse,
  type Difficulty,
  type ActiveGame,
  type GameMode,
  type Progress,
  type SolverStrategyType,
} from '../../types/game';
import { emptyProgress, isUnlocked, lockReason } from '../../utils/progression';
import { BenchmarkLab } from './BenchmarkLab';
import { LeaderboardTable } from './LeaderboardTable';

export interface GameSetup {
  mode: GameMode;
  difficulty: Difficulty;
  solverStrategy: SolverStrategyType;
  seed?: string;
  playerName?: string;
}

interface DashboardProps {
  onStart: (setup: GameSetup) => void;
  isStarting: boolean;
  errorMessage: string | null;
  username?: string | null;
  progress?: Progress;
  activeGame?: ActiveGame | null;
  onContinue?: () => void;
  onDiscardActiveGame?: () => void;
  onLogout?: () => void;
}

type BadgeTone = 'slate' | 'fuchsia' | 'amber';

interface ModifierBadge {
  label: string;
  tone: BadgeTone;
}

const BADGE_CLASSES: Record<BadgeTone, string> = {
  slate: 'border-slate-600 bg-slate-700/60 text-slate-300',
  fuchsia: 'border-fuchsia-500/50 bg-fuchsia-500/15 text-fuchsia-200',
  amber: 'border-amber-400/60 bg-amber-400/15 text-amber-200',
};

const MODES: ReadonlyArray<{ value: GameMode; title: string; description: string; Icon: typeof Grid3x3 }> = [
  {
    value: 'CLASSIC',
    title: 'Classic',
    description: 'Pure Killer Sudoku with 3 lives. Every wrong number costs one life.',
    Icon: Grid3x3,
  },
  {
    value: 'BOT_CHALLENGE',
    title: 'Bot Challenge',
    description: 'A bot with a 2-3 minute first timer hunts your HP, then 45-60s per round. Wrong numbers cost HP too.',
    Icon: Bot,
  },
];

const DIFFICULTIES: readonly Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

type DashboardTab = 'play' | 'benchmark';

const TABS: ReadonlyArray<{ value: DashboardTab; title: string; Icon: typeof Gamepad2 }> = [
  { value: 'play', title: 'Play Game', Icon: Gamepad2 },
  { value: 'benchmark', title: 'Algorithm Benchmark Lab', Icon: FlaskConical },
];

const SOLVER_ENGINES: ReadonlyArray<{
  value: SolverStrategyType;
  title: string;
  description: string;
  Icon: typeof Zap;
}> = [
  {
    value: 'OPTIMIZED_MRV_PRUNING',
    title: 'Optimized (MRV + Pruning)',
    description: 'Minimum remaining values, forward checking and cage-sum bounds. Fast.',
    Icon: Zap,
  },
  {
    value: 'NAIVE_ORACLE',
    title: 'Naive Oracle',
    description: 'Plain row-major backtracking. The slow reference implementation.',
    Icon: Cpu,
  },
];

const BOT_TUNING: Record<
  Difficulty,
  { firstTimeoutMinutes: number; timeoutSeconds: number; hpPressure: number | string }
> = {
  EASY: { firstTimeoutMinutes: 2, timeoutSeconds: 45, hpPressure: 15 },
  MEDIUM: { firstTimeoutMinutes: 2, timeoutSeconds: 50, hpPressure: 'Random (10 - 25)' },
  HARD: { firstTimeoutMinutes: 3, timeoutSeconds: 60, hpPressure: 'Random (5 - 30)' },
};

const PLAYER_NAME_KEY = 'killer-sudoku:player-name';
const MAX_PLAYER_NAME_LENGTH = 20;

export function modifierBadges(mode: GameMode, difficulty: Difficulty): ModifierBadge[] {
  const emptyBoard: ModifierBadge[] =
    difficulty === 'HARD' ? [{ label: 'Empty board: no given numbers', tone: 'amber' }] : [];
  if (mode === 'CLASSIC') {
    return [{ label: 'No modifiers', tone: 'slate' }, ...emptyBoard];
  }
  const { firstTimeoutMinutes, timeoutSeconds, hpPressure } = BOT_TUNING[difficulty];
  const badges: ModifierBadge[] = [
    {
      label: typeof hpPressure === 'number'
        ? `Bot HP pressure: -${hpPressure} HP`
        : `Bot HP pressure: ${hpPressure} HP`,
      tone: 'fuchsia',
    },
    { label: `First bot timer ${firstTimeoutMinutes} min`, tone: 'fuchsia' },
    { label: `Then bot timer ${timeoutSeconds}s`, tone: 'fuchsia' },
    ...emptyBoard,
  ];
  if (difficulty === 'HARD') {
    badges.push({ label: 'Cage Reshape every 5 min', tone: 'amber' });
  }
  return badges;
}

function loadPlayerName(): string {
  try {
    return window.localStorage.getItem(PLAYER_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function savePlayerName(name: string): void {
  try {
    window.localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // storage may be unavailable (private mode); the name just won't persist
  }
}

function label(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const DEFAULT_PROGRESS = emptyProgress();

export function Dashboard({
  onStart,
  isStarting,
  errorMessage,
  username = null,
  progress = DEFAULT_PROGRESS,
  activeGame = null,
  onContinue,
  onDiscardActiveGame,
  onLogout,
}: DashboardProps) {
  const [mode, setMode] = useState<GameMode>('CLASSIC');
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [tab, setTab] = useState<DashboardTab>('play');
  const [solverStrategy, setSolverStrategy] = useState<SolverStrategyType>(DEFAULT_SOLVER_STRATEGY);
  const [isDaily, setIsDaily] = useState(false);
  const [playerName, setPlayerName] = useState(loadPlayerName);
  const [dailySeed, setDailySeed] = useState<DailySeedResponse | null>(null);
  const [dailyUnavailable, setDailyUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchDailySeed(controller.signal)
      .then(setDailySeed)
      .catch(() => {
        if (!controller.signal.aborted) {
          setDailyUnavailable(true);
        }
      });
    return () => controller.abort();
  }, []);

  const levelUnlocked = isUnlocked(progress, mode, difficulty);
  const canStart = !isStarting && levelUnlocked && (!isDaily || dailySeed !== null);

  const handleStart = (): void => {
    if (!canStart) {
      return;
    }
    const trimmed = playerName.trim();
    if (isDaily && dailySeed) {
      savePlayerName(trimmed);
      onStart({
        mode,
        difficulty,
        solverStrategy: DEFAULT_SOLVER_STRATEGY,
        seed: dailySeed.seed,
        playerName: trimmed || undefined,
      });
    } else {
      onStart({ mode, difficulty, solverStrategy });
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
        {username && (
          <div className="flex items-center justify-end gap-3 text-sm text-slate-300">
            <span data-testid="signed-in-as">
              Signed in as <strong className="text-slate-100">{username}</strong>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 font-semibold hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        )}

        {activeGame && (
          <section
            aria-label="Game in progress"
            className="flex flex-col gap-3 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-bold text-emerald-200">Game in progress</p>
              <p className="text-sm text-slate-300" data-testid="active-game-summary">
                {label(activeGame.mode.replace('_', ' '))} / {label(activeGame.difficulty)} ·{' '}
                {formatElapsed(activeGame.elapsedMs)} played
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onContinue}
                disabled={isStarting}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Continue playing
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Discard your saved game and start a new one?')) {
                    onDiscardActiveGame?.();
                  }
                }}
                disabled={isStarting}
                className="flex items-center gap-2 rounded-xl border border-slate-500 px-4 py-2 font-bold hover:bg-slate-700 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Start new game
              </button>
            </div>
          </section>
        )}

        <header className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Killer Sudoku</h1>
          <p className="mt-2 text-slate-400">Server-authoritative single player. Pick a mode, beat the clock.</p>
        </header>

        <div role="tablist" aria-label="Dashboard sections" className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800/60 p-1.5">
          {TABS.map(({ value, title, Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`tab-${value}`}
              aria-selected={tab === value}
              aria-controls={`panel-${value}`}
              onClick={() => setTab(value)}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors sm:text-base ${
                tab === value ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {title}
            </button>
          ))}
        </div>

        <div id="panel-benchmark" role="tabpanel" aria-labelledby="tab-benchmark" hidden={tab !== 'benchmark'}>
          <BenchmarkLab />
        </div>

        <div id="panel-play" role="tabpanel" aria-labelledby="tab-play" hidden={tab !== 'play'}>
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <section className="flex flex-col gap-6 rounded-2xl border border-slate-700 bg-slate-800/60 p-4 sm:p-6">
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Mode</h2>
                <div role="radiogroup" aria-label="Game mode" className="grid gap-3 sm:grid-cols-2">
                  {MODES.map(({ value, title, description, Icon }) => {
                    const selected = mode === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setMode(value);
                          if (!isUnlocked(progress, value, difficulty)) {
                            setDifficulty('EASY');
                          }
                        }}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          selected
                            ? 'border-sky-400 bg-sky-500/15 ring-1 ring-sky-400'
                            : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-2 font-bold">
                          <Icon className={`h-5 w-5 ${selected ? 'text-sky-300' : 'text-slate-400'}`} aria-hidden="true" />
                          {title}
                        </span>
                        <span className="mt-1 block text-sm text-slate-400">{description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Difficulty</h2>
                <div role="radiogroup" aria-label="Difficulty" className="grid gap-3 sm:grid-cols-3">
                  {DIFFICULTIES.map((value) => {
                    const selected = difficulty === value;
                    const locked = lockReason(progress, mode, value);
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-disabled={locked !== null}
                        title={locked ?? undefined}
                        onClick={() => {
                          if (locked === null) {
                            setDifficulty(value);
                          }
                        }}
                        className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${
                          locked !== null ? 'cursor-not-allowed opacity-60 ' : ''
                        }${
                          selected
                            ? 'border-sky-400 bg-sky-500/15 ring-1 ring-sky-400'
                            : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 font-bold">
                          {locked !== null && <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />}
                          {label(value)}
                        </span>
                        {locked !== null && (
                          <span data-testid={`lock-${value}`} className="text-xs text-amber-200/80">
                            {locked}
                          </span>
                        )}
                        <span className="flex flex-wrap gap-1.5" data-testid={`badges-${value}`}>
                          {modifierBadges(mode, value).map((badge) => (
                            <span
                              key={badge.label}
                              className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-tight ${BADGE_CLASSES[badge.tone]}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Solver Engine</h2>
                <div role="radiogroup" aria-label="Solver engine" className="grid gap-3 sm:grid-cols-2">
                  {SOLVER_ENGINES.map(({ value, title, description, Icon }) => {
                    const selected = (isDaily ? DEFAULT_SOLVER_STRATEGY : solverStrategy) === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={isDaily}
                        onClick={() => setSolverStrategy(value)}
                        className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? 'border-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-400'
                            : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-bold">
                          <Icon className={`h-4 w-4 ${selected ? 'text-emerald-300' : 'text-slate-400'}`} aria-hidden="true" />
                          {title}
                        </span>
                        <span className="mt-1 block text-xs text-slate-400">{description}</span>
                      </button>
                    );
                  })}
                </div>
                {isDaily && (
                  <p data-testid="solver-locked" className="mt-2 text-xs text-amber-200/80">
                    The Daily Seed Challenge always uses the Optimized engine so everyone gets the same puzzle.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 font-bold">
                      <CalendarDays className="h-5 w-5 text-amber-300" aria-hidden="true" />
                      Daily Seed Challenge
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Everyone gets the same puzzle today. Wins are replay-verified by the server and ranked
                      (+5s per wrong answer).
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-500" data-testid="daily-seed">
                      {dailySeed ? dailySeed.seed : dailyUnavailable ? 'Daily seed unavailable' : 'Loading daily seed…'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isDaily}
                    aria-label="Daily Seed Challenge"
                    onClick={() => setIsDaily((value) => !value)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      isDaily ? 'bg-amber-500' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        isDaily ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {isDaily && (
                  <label className="mt-4 block text-sm text-slate-300">
                    Name on the leaderboard
                    <input
                      type="text"
                      value={playerName}
                      maxLength={MAX_PLAYER_NAME_LENGTH}
                      placeholder="Anonymous"
                      onChange={(event) => setPlayerName(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-sky-400"
                    />
                  </label>
                )}
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {errorMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStarting ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : isDaily ? (
                  <Layers className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Play className="h-5 w-5" aria-hidden="true" />
                )}
                {isStarting ? 'Starting…' : isDaily ? 'Start Daily Challenge' : 'Start game'}
              </button>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 sm:p-6">
              <LeaderboardTable mode={mode} difficulty={difficulty} />
              <p className="mt-3 text-xs text-slate-500">
                Showing {label(mode.replace('_', ' '))} / {label(difficulty)}. Only Daily Seed runs are ranked.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
