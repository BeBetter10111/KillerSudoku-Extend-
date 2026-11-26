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
import { AppHeader, navLinkClass } from '../layout/AppHeader';
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
  slate: 'border-ink/20 bg-white text-ink-soft',
  fuchsia: 'border-lilac-300 bg-lilac-100 text-lilac-600',
  amber: 'border-sunny-500/70 bg-sunny-100 text-amber-800',
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

const TABS: ReadonlyArray<{ value: DashboardTab; title: string; short: string; Icon: typeof Gamepad2 }> = [
  { value: 'play', title: 'Play Game', short: 'Play', Icon: Gamepad2 },
  { value: 'benchmark', title: 'Algorithm Benchmark Lab', short: 'Benchmark Lab', Icon: FlaskConical },
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
    <main className="relative min-h-screen bg-paper text-ink">
      <Doodles />
      <AppHeader logoAs="h1">
        <nav>
          <div role="tablist" aria-label="Dashboard sections" className="flex items-center gap-5 sm:gap-7">
            {TABS.map(({ value, title, short, Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`tab-${value}`}
                aria-label={title}
                aria-selected={tab === value}
                aria-controls={`panel-${value}`}
                onClick={() => setTab(value)}
                className={navLinkClass(tab === value)}
              >
                <Icon className="h-4 w-4 sm:hidden" aria-hidden="true" />
                {short}
              </button>
            ))}
          </div>
        </nav>
      </AppHeader>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:py-10">
        <div id="panel-benchmark" role="tabpanel" aria-labelledby="tab-benchmark" hidden={tab !== 'benchmark'}>
          <BenchmarkLab />
        </div>

        <div id="panel-play" role="tabpanel" aria-labelledby="tab-play" hidden={tab !== 'play'}>
          <div className="mb-6">
            <h2 className="text-3xl leading-tight sm:text-4xl">New game</h2>
            <p className="mt-1 text-lg text-ink-soft">Server-authoritative single player. Pick a mode, beat the clock.</p>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
            <section className="sketch-card flex flex-col gap-6 p-4 sm:p-6">
              <div>
                <h3 className="section-label mb-3">Mode</h3>
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
                        className={`sketch-option p-4 ${selected ? 'sketch-option-selected' : ''}`}
                      >
                        <span className="flex items-center gap-2 text-xl">
                          <Icon className={`h-5 w-5 ${selected ? 'text-lilac-600' : 'text-ink-faint'}`} aria-hidden="true" />
                          {title}
                        </span>
                        <span className="mt-1 block leading-snug text-ink-soft">{description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="section-label mb-3">Difficulty</h3>
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
                        className={`sketch-option flex flex-col gap-2 p-3 ${selected ? 'sketch-option-selected' : ''}`}
                      >
                        <span className="text-xl">{label(value)}</span>
                        <span className="flex flex-wrap gap-1.5" data-testid={`badges-${value}`}>
                          {modifierBadges(mode, value).map((badge) => (
                            <span
                              key={badge.label}
                              className={`rounded-md border px-1.5 py-0.5 text-xs leading-tight ${BADGE_CLASSES[badge.tone]}`}
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
                <h3 className="section-label mb-3">Solver Engine</h3>
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
                        className={`sketch-option p-3 ${selected ? 'sketch-option-selected' : ''}`}
                      >
                        <span className="flex items-center gap-2 text-lg">
                          <Icon className={`h-4 w-4 ${selected ? 'text-lilac-600' : 'text-ink-faint'}`} aria-hidden="true" />
                          {title}
                        </span>
                        <span className="mt-1 block text-sm leading-snug text-ink-soft">{description}</span>
                      </button>
                    );
                  })}
                </div>
                {isDaily && (
                  <p data-testid="solver-locked" className="mt-2 text-sm text-amber-800">
                    The Daily Seed Challenge always uses the Optimized engine so everyone gets the same puzzle.
                  </p>
                )}
              </div>

              <div className="rounded-xl border-2 border-dashed border-lilac-300 bg-lilac-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-xl">
                      <CalendarDays className="h-5 w-5 text-lilac-500" aria-hidden="true" />
                      Daily Seed Challenge
                    </p>
                    <p className="mt-1 leading-snug text-ink-soft">
                      Everyone gets the same puzzle today. Wins are replay-verified by the server and ranked
                      (+5s per wrong answer).
                    </p>
                    <p className="mt-1 font-mono text-xs text-ink-faint" data-testid="daily-seed">
                      {dailySeed ? dailySeed.seed : dailyUnavailable ? 'Daily seed unavailable' : 'Loading daily seed…'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isDaily}
                    aria-label="Daily Seed Challenge"
                    onClick={() => setIsDaily((value) => !value)}
                    className={`relative h-8 w-14 shrink-0 rounded-full border-2 border-ink outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac-400 focus-visible:ring-offset-2 ${
                      isDaily ? 'bg-lilac-300' : 'bg-white'
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full border-2 border-ink bg-white transition-transform ${
                        isDaily ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {isDaily && (
                  <label className="mt-4 block text-ink-soft">
                    Name on the leaderboard
                    <input
                      type="text"
                      value={playerName}
                      maxLength={MAX_PLAYER_NAME_LENGTH}
                      placeholder="Anonymous"
                      onChange={(event) => setPlayerName(event.target.value)}
                      className="mt-1 w-full rounded-lg border-2 border-ink bg-white px-3 py-2 text-lg text-ink outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-lilac-300"
                    />
                  </label>
                )}
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-red-700">
                  {errorMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="sketch-btn sketch-btn-primary px-6 py-3 text-xl shadow-sketch"
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

            <section className="sketch-card p-4 sm:p-6">
              <LeaderboardTable mode={mode} difficulty={difficulty} />
              <p className="mt-3 text-sm text-ink-faint">
                Showing {label(mode.replace('_', ' '))} / {label(difficulty)}. Only Daily Seed runs are ranked.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
