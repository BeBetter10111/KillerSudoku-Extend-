import { Clock3, LogOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dashboard, type GameSetup } from './components/dashboard/Dashboard';
import { PageShell, type NavKey } from './components/layout/AppShell';
import { SudokuBoard } from './components/board/SudokuBoard';
import { ResultModal } from './components/game/ResultModal';
import { AlgorithmEvidencePanel } from './components/status/AlgorithmEvidencePanel';
import { BotTimer } from './components/status/BotTimer';
import { HealthBar } from './components/status/HealthBar';
import { ReshapeTimer } from './components/status/ReshapeTimer';
import { connectAndStartGame, leaveGame } from './services/socketClient';
import { useGameStore } from './store/useGameStore';
import { formatClock } from './utils/formatTime';

const START_TIMEOUT_MS = 10_000;

type StartKind = 'idle' | 'fresh' | 'restart';

function GameClock() {
  const elapsedMs = useGameStore((state) => state.elapsedMs);
  return (
    <span
      role="timer"
      aria-label="Elapsed time"
      className="ml-auto flex items-center gap-1.5 font-mono text-xl font-bold tabular-nums text-ink"
    >
      <Clock3 className="h-5 w-5 fill-doodle-yellow text-ink" aria-hidden="true" />
      {formatClock(elapsedMs)}
    </span>
  );
}

function ConnectedResultModal({ onPlayAgain, onBackToDashboard }: { onPlayAgain: () => void; onBackToDashboard: () => void }) {
  const gameStatus = useGameStore((state) => state.gameStatus);
  const elapsedMs = useGameStore((state) => state.elapsedMs);
  const endReason = useGameStore((state) => state.endReason);
  const mode = useGameStore((state) => state.mode);
  const difficulty = useGameStore((state) => state.difficulty);
  const seed = useGameStore((state) => state.seed);
  const hp = useGameStore((state) => state.hp);
  const maxHp = useGameStore((state) => state.maxHp);

  return (
    <ResultModal
      won={gameStatus === 'WON'}
      reason={endReason}
      finalTimeMs={elapsedMs}
      mode={mode}
      difficulty={difficulty}
      seed={seed}
      hp={hp}
      maxHp={maxHp}
      onPlayAgain={onPlayAgain}
      onBackToDashboard={onBackToDashboard}
    />
  );
}

function StartingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-pale-blush font-doodle text-ink">
      <p role="status" className="card-doodle animate-pulse px-6 py-4 text-lg">
        Starting a new game…
      </p>
    </main>
  );
}

export default function App() {
  const gameStatus = useGameStore((state) => state.gameStatus);
  const storeError = useGameStore((state) => state.errorMessage);
  const [startKind, setStartKind] = useState<StartKind>('idle');
  const [startError, setStartError] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<NavKey>('play');
  const lastSetup = useRef<GameSetup | null>(null);

  const startGame = useCallback(async (setup: GameSetup, kind: Exclude<StartKind, 'idle'>) => {
    lastSetup.current = setup;
    useGameStore.getState().resetGame();
    setStartError(null);
    setStartKind(kind);
    try {
      await connectAndStartGame(
        setup.mode,
        setup.difficulty,
        setup.solverStrategy,
        setup.seed,
        setup.playerName,
      );
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Could not start the game.');
      setStartKind('idle');
    }
  }, []);

  useEffect(() => {
    if (startKind === 'idle') {
      return undefined;
    }
    if (gameStatus !== 'IDLE' || storeError !== null) {
      setStartKind('idle');
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setStartError('The server did not respond. Please try again.');
      setStartKind('idle');
      void leaveGame();
    }, START_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [startKind, gameStatus, storeError]);

  const backToDashboard = useCallback(async (tab: NavKey = 'play') => {
    setDashboardTab(tab);
    await leaveGame();
    useGameStore.getState().resetGame();
    setStartError(null);
  }, []);

  const quit = useCallback(
    (tab: NavKey = 'play') => {
      if (useGameStore.getState().gameStatus !== 'PLAYING') {
        void backToDashboard(tab);
        return;
      }
      if (window.confirm('Leave this game? Your progress will be lost.')) {
        void backToDashboard(tab);
      }
    },
    [backToDashboard],
  );

  const playAgain = useCallback(() => {
    if (lastSetup.current) {
      void startGame(lastSetup.current, 'restart');
    }
  }, [startGame]);

  if (gameStatus === 'IDLE') {
    if (startKind === 'restart') {
      return <StartingScreen />;
    }
    return (
      <Dashboard
        onStart={(setup) => void startGame(setup, 'fresh')}
        isStarting={startKind === 'fresh'}
        initialTab={dashboardTab}
        errorMessage={startError ?? storeError}
      />
    );
  }

  return (
    <PageShell
      active="play"
      onNavigate={(key) => {
        if (key !== 'play') {
          quit(key);
        }
      }}
    >
      <main className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-3 py-5 sm:px-6">
        <StatusBar />
        <ArenaChips />
        {storeError !== null && gameStatus === 'PLAYING' && (
          <div
            role="alert"
            className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-crimson bg-blush px-4 py-2 text-sm text-crimson"
          >
            <span>{storeError}</span>
            <button type="button" onClick={() => void backToDashboard()} className="btn-doodle shrink-0 px-3 py-1 text-xs">
              Back to Dashboard
            </button>
          </div>
        )}
        <SudokuBoard
          sidebar={
            <aside className="flex flex-col gap-5">
              <AlgorithmEvidencePanel />
              {gameStatus === 'PLAYING' && (
                <button
                  type="button"
                  onClick={() => quit()}
                  className="btn-doodle flex items-center justify-center gap-2 bg-lavender px-4 py-3 text-sm"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  New Game
                </button>
              )}
            </aside>
          }
        />
      </main>
      {(gameStatus === 'WON' || gameStatus === 'LOST') && (
        <ConnectedResultModal onPlayAgain={playAgain} onBackToDashboard={() => void backToDashboard()} />
      )}
    </PageShell>
  );
}

function StatusBar() {
  return (
    <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 border-ink bg-white px-3 py-2 shadow-doodle-sm">
      <HealthBar />
      <BotTimer />
      <ReshapeTimer />
      <GameClock />
    </div>
  );
}

function ArenaChips() {
  const mode = useGameStore((state) => state.mode);
  const difficulty = useGameStore((state) => state.difficulty);
  const seed = useGameStore((state) => state.seed);
  const solverStrategy = useGameStore((state) => state.solverStrategy);
  const isDaily = seed !== null && seed.startsWith('daily-');
  const chip = 'rounded-full border border-ink/60 px-2.5 py-0.5';

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 text-[11px] text-ink">
      <span className={`${chip} bg-lavender/40`}>{mode === 'BOT_CHALLENGE' ? 'Bot Challenge' : 'Classic'}</span>
      <span className={`${chip} bg-blush`}>{difficulty}</span>
      {isDaily && <span className={`${chip} bg-doodle-yellow`}>Daily</span>}
      {solverStrategy !== null && (
        <span data-testid="engine-chip" className={`${chip} bg-doodle-sky`}>
          {solverStrategy === 'NAIVE_ORACLE' ? 'Naive Oracle' : 'Optimized'}
        </span>
      )}
    </div>
  );
}
