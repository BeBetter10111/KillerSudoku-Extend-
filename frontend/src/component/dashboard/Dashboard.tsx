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
import { AppHeader, NavTab } from '../layout/AppHeader';
import { Doodles } from '../layout/Doodles';
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
  slate: 'border-muted/40 bg-paper text-muted',
  fuchsia: 'border-cage/60 bg-lavender/30 text-ink',
  amber: 'border-crimson/60 bg-doodle-yellow/60 text-ink',
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
    <div className="doodle-paper min-h-screen text-ink">
      <Doodles />
      <AppHeader asHeading>
        <nav role="tablist" aria-label="Dashboard sections" className="flex items-center gap-5">
          {TABS.map(({ value, title, Icon }) => (
            <NavTab
              key={value}
              role="tab"
              id={`tab-${value}`}
              active={tab === value}
              aria-selected={tab === value}
              aria-controls={`panel-${value}`}
              onClick={() => setTab(value)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {title}
            </NavTab>
          ))}
        </nav>
      </AppHeader>
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
        <p className="rounded-2xl border-2 border-ink bg-blush px-4 py-2 text-lg shadow-doodle-sm">
          <span aria-hidden="true">★ </span>
          Server-authoritative single player. Pick a mode, beat the clock.
        </p>

        <div id="panel-benchmark" role="tabpanel" aria-labelledby="tab-benchmark" hidden={tab !== 'benchmark'}>
          <BenchmarkLab />
        </div>

        <div id="panel-play" role="tabpanel" aria-labelledby="tab-play" hidden={tab !== 'play'}>
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <section className="flex flex-col gap-6 doodle-card p-4 sm:p-6">
              <div>
                <h2 className="mb-3 text-xl text-ink">Mode</h2>
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
                        className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                          selected
                            ? 'border-ink bg-lavender/35 shadow-doodle'
                            : 'border-ink/30 bg-paper hover:border-ink hover:bg-paleblush'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${selected ? 'text-cage' : 'text-muted'}`} aria-hidden="true" />
                          {title}
                        </span>
                        <span className="mt-1 block text-sm text-muted">{description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl text-ink">Difficulty</h2>
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
                        className={`flex flex-col gap-2 rounded-2xl border-2 p-3 text-left transition-colors ${
                          selected
                            ? 'border-ink bg-lavender/35 shadow-doodle'
                            : 'border-ink/30 bg-paper hover:border-ink hover:bg-paleblush'
                        }`}
                      >
                        <span className="font-normal">{label(value)}</span>
                        <span className="flex flex-wrap gap-1.5" data-testid={`badges-${value}`}>
                          {modifierBadges(mode, value).map((badge) => (
                            <span
                              key={badge.label}
                              className={`rounded-full border px-2 py-0.5 text-xs leading-tight ${BADGE_CLASSES[badge.tone]}`}
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
                <h2 className="mb-3 text-xl text-ink">Solver Engine</h2>
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
                        className={`rounded-2xl border-2 p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? 'border-ink bg-blush shadow-doodle'
                            : 'border-ink/30 bg-paper hover:border-ink hover:bg-paleblush'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <Icon className={`h-4 w-4 ${selected ? 'text-cage' : 'text-muted'}`} aria-hidden="true" />
                          {title}
                        </span>
                        <span className="mt-1 block text-xs text-muted">{description}</span>
                      </button>
                    );
                  })}
                </div>
                {isDaily && (
                  <p data-testid="solver-locked" className="mt-2 text-xs text-crimson">
                    The Daily Seed Challenge always uses the Optimized engine so everyone gets the same puzzle.
                  </p>
                )}
              </div>

              <div className="rounded-xl border-2 border-ink/80 bg-paleblush/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-crimson" aria-hidden="true" />
                      Daily Seed Challenge
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Everyone gets the same puzzle today. Wins are replay-verified by the server and ranked
                      (+5s per wrong answer).
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted" data-testid="daily-seed">
                      {dailySeed ? dailySeed.seed : dailyUnavailable ? 'Daily seed unavailable' : 'Loading daily seed…'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isDaily}
                    aria-label="Daily Seed Challenge"
                    onClick={() => setIsDaily((value) => !value)}
                    className={`relative h-7 w-12 shrink-0 rounded-full border-2 border-ink transition-colors ${
                      isDaily ? 'bg-cage' : 'bg-dusty'
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-0 h-6 w-6 -translate-y-[2px] rounded-full border-2 border-ink bg-paper transition-transform ${
                        isDaily ? 'translate-x-5' : '-translate-x-[2px]'
                      }`}
                    />
                  </button>
                </div>
                {isDaily && (
                  <label className="mt-4 block text-sm text-ink">
                    Name on the leaderboard
                    <input
                      type="text"
                      value={playerName}
                      maxLength={MAX_PLAYER_NAME_LENGTH}
                      placeholder="Anonymous"
                      onChange={(event) => setPlayerName(event.target.value)}
                      className="mt-1 w-full rounded-xl border-2 border-ink bg-paper px-3 py-2 text-ink outline-none focus:border-cage focus:ring-2 focus:ring-lavender"
                    />
                  </label>
                )}
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-xl border-2 border-crimson bg-paleblush px-3 py-2 text-base text-crimson">
                  {errorMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-lavender px-6 py-3 text-xl text-ink shadow-doodle transition-[transform,box-shadow,background-color] hover:bg-cage hover:text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
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

            <section className="doodle-card self-start p-4 sm:p-6">
              <LeaderboardTable mode={mode} difficulty={difficulty} />
              <p className="mt-3 text-xs text-muted">
                Showing {label(mode.replace('_', ' '))} / {label(difficulty)}. Only Daily Seed runs are ranked.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
