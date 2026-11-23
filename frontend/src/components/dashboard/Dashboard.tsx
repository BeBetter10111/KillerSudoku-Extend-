import { Bot, CalendarDays, Cpu, FlaskConical, Gamepad2, Grid3x3, Layers, Loader2, Play, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchDailySeed } from '../../services/apiClient';
import {
  DEFAULT_SOLVER_STRATEGY,
  type DailySeedResponse,
  type Difficulty,
  type GameMode,
  type SolverStrategyType,
} from '../../types/game';
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
    description: 'A bot with a 2-minute timer hunts your HP. Wrong numbers cost HP too.',
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

const BOT_TUNING: Record<Difficulty, { timeoutSeconds: number; hpPressure: number | string }> = {
  EASY: { timeoutSeconds: 45, hpPressure: 15 },
  MEDIUM: { timeoutSeconds: 30, hpPressure: 'Random (10 - 25)' },
  HARD: { timeoutSeconds: 25, hpPressure: 'Random (5 - 30)' },
};

const PLAYER_NAME_KEY = 'killer-sudoku:player-name';
const MAX_PLAYER_NAME_LENGTH = 20;

export function modifierBadges(mode: GameMode, difficulty: Difficulty): ModifierBadge[] {
  if (mode === 'CLASSIC') {
    return [{ label: 'No modifiers', tone: 'slate' }];
  }
  const { timeoutSeconds, hpPressure } = BOT_TUNING[difficulty];
  const badges: ModifierBadge[] = [
    {
      label: typeof hpPressure === 'number'
        ? `Bot HP pressure: -${hpPressure} HP`
        : `Bot HP pressure: ${hpPressure} HP`,
      tone: 'fuchsia',
    },
    { label: `Bot timer ${timeoutSeconds}s`, tone: 'fuchsia' },
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

export function Dashboard({ onStart, isStarting, errorMessage }: DashboardProps) {
  const [mode, setMode] = useState<GameMode>('CLASSIC');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
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

  const canStart = !isStarting && (!isDaily || dailySeed !== null);

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
                        onClick={() => setMode(value)}
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
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setDifficulty(value)}
                        className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${
                          selected
                            ? 'border-sky-400 bg-sky-500/15 ring-1 ring-sky-400'
                            : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                        }`}
                      >
                        <span className="font-bold">{label(value)}</span>
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
