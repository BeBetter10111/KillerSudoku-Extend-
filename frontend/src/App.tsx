import { Clock3, LogOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dashboard, type GameSetup } from './components/dashboard/Dashboard';
import { SudokuBoard } from './components/board/SudokuBoard';
import { ResultModal } from './components/game/ResultModal';
import { AlgorithmEvidencePanel } from './components/status/AlgorithmEvidencePanel';
import { BotTimer } from './components/status/BotTimer';
import { HealthBar } from './components/status/HealthBar';
import { ReshapeTimer } from './components/status/ReshapeTimer';
import { AuthPage } from './components/auth/AuthPage';
import { ApiError, discardActiveGame, fetchMe, logOut } from './services/apiClient';
import { connectAndResumeGame, connectAndStartGame, leaveGame, saveAndExit } from './services/socketClient';
import { useAuthStore } from './store/useAuthStore';
import type { ActiveGame, Progress } from './types/game';
import { useGameStore } from './store/useGameStore';
import { formatClock } from './utils/formatTime';
import { emptyProgress } from './utils/progression';

const START_TIMEOUT_MS = 10_000;

type StartKind = 'idle' | 'fresh' | 'restart';

function GameClock() {
  const elapsedMs = useGameStore((state) => state.elapsedMs);
  return (
    <span
      role="timer"
      aria-label="Elapsed time"
      className="flex items-center gap-1.5 font-mono text-xl font-bold tabular-nums text-slate-100"
    >
      <Clock3 className="h-5 w-5 text-slate-400" aria-hidden="true" />
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

  return (
    <ResultModal
      won={gameStatus === 'WON'}
      reason={endReason}
      finalTimeMs={elapsedMs}
      mode={mode}
      difficulty={difficulty}
      seed={seed}
      onPlayAgain={onPlayAgain}
      onBackToDashboard={onBackToDashboard}
    />
  );
}

function StartingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">
      <p role="status" className="animate-pulse text-lg">
        Starting a new game…
      </p>
    </main>
  );
}

interface Profile {
  progress: Progress;
  activeGame: ActiveGame | null;
}

export default function App() {
  const token = useAuthStore((state) => state.token);
  if (token === null) {
    return <AuthPage />;
  }
  return <Game token={token} />;
}

function Game({ token }: { token: string }) {
  const username = useAuthStore((state) => state.username);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const storeError = useGameStore((state) => state.errorMessage);
  const [startKind, setStartKind] = useState<StartKind>('idle');
  const [startError, setStartError] = useState<string | null>(null);
  const lastSetup = useRef<GameSetup | null>(null);
  const [profile, setProfile] = useState<Profile>({ progress: emptyProgress(), activeGame: null });

  const signOut = useCallback(async () => {
    await logOut(token);
    useGameStore.getState().resetGame();
    useAuthStore.getState().clearSession();
  }, [token]);

  useEffect(() => {
    if (gameStatus !== 'IDLE') {
      return undefined;
    }
    let cancelled = false;
    fetchMe(token)
      .then((me) => {
        if (!cancelled) {
          setProfile({ progress: me.progress, activeGame: me.activeGame });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof ApiError && error.status === 401) {
          useAuthStore.getState().clearSession();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, gameStatus, startKind]);

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

  const continueGame = useCallback(async () => {
    const saved = profile.activeGame;
    if (!saved) {
      return;
    }
    lastSetup.current = { mode: saved.mode, difficulty: saved.difficulty, solverStrategy: saved.solverStrategy };
    useGameStore.getState().resetGame();
    setStartError(null);
    setStartKind('fresh');
    try {
      await connectAndResumeGame(saved.solverStrategy);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Could not continue the game.');
      setStartKind('idle');
    }
  }, [profile.activeGame]);

  const discardSavedGame = useCallback(async () => {
    try {
      await discardActiveGame(token);
      setProfile((current) => ({ ...current, activeGame: null }));
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Could not discard the saved game.');
    }
  }, [token]);

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

  const backToDashboard = useCallback(async () => {
    await leaveGame();
    useGameStore.getState().resetGame();
    setStartError(null);
  }, []);

  const quit = useCallback(() => {
    if (window.confirm('Save and exit? You can continue this game later from the dashboard.')) {
      void (async () => {
        await saveAndExit();
        useGameStore.getState().resetGame();
        setStartError(null);
      })();
    }
  }, [backToDashboard]);

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
        errorMessage={startError ?? storeError}
        username={username}
        progress={profile.progress}
        activeGame={profile.activeGame}
        onContinue={() => void continueGame()}
        onDiscardActiveGame={() => void discardSavedGame()}
        onLogout={() => void signOut()}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 p-3 sm:p-6">
        <ArenaHeader onQuit={quit} />
        {storeError !== null && gameStatus === 'PLAYING' && (
          <div
            role="alert"
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
          >
            <span>{storeError}</span>
            <button
              type="button"
              onClick={() => void backToDashboard()}
              className="shrink-0 rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-500"
            >
              Back to Dashboard
            </button>
          </div>
        )}
        <div className="flex w-full flex-col items-center gap-3 lg:flex-row lg:items-start lg:justify-center">
          <div className="flex w-full max-w-3xl flex-col items-center gap-3">
            <div className="grid w-full gap-3 empty:hidden sm:grid-cols-2">
              <HealthBar />
              <BotTimer />
              <ReshapeTimer />
            </div>
            <SudokuBoard />
          </div>
          <aside className="w-full max-w-3xl lg:w-80 lg:shrink-0">
            <AlgorithmEvidencePanel />
          </aside>
        </div>
      </div>
      {(gameStatus === 'WON' || gameStatus === 'LOST') && (
        <ConnectedResultModal onPlayAgain={playAgain} onBackToDashboard={() => void backToDashboard()} />
      )}
    </main>
  );
}

function ArenaHeader({ onQuit }: { onQuit: () => void }) {
  const mode = useGameStore((state) => state.mode);
  const difficulty = useGameStore((state) => state.difficulty);
  const seed = useGameStore((state) => state.seed);
  const solverStrategy = useGameStore((state) => state.solverStrategy);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const isDaily = seed !== null && seed.startsWith('daily-');

  return (
    <header className="flex w-full items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
        <span className="rounded-md bg-slate-700 px-2 py-1">{mode === 'BOT_CHALLENGE' ? 'Bot Challenge' : 'Classic'}</span>
        <span className="rounded-md bg-slate-700 px-2 py-1">{difficulty}</span>
        {isDaily && <span className="rounded-md bg-amber-400/20 px-2 py-1 text-amber-200">Daily</span>}
        {solverStrategy !== null && (
          <span data-testid="engine-chip" className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-200">
            {solverStrategy === 'NAIVE_ORACLE' ? 'Naive Oracle' : 'Optimized'}
          </span>
        )}
      </div>
      <GameClock />
      {gameStatus === 'PLAYING' ? (
        <button
          type="button"
          onClick={onQuit}
          className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Save &amp; Exit
        </button>
      ) : (
        <span className="w-[72px]" aria-hidden="true" />
      )}
    </header>
  );
}

