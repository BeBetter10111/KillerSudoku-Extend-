import { Clock3, Save } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dashboard, type DashboardTab, type GameSetup } from './components/dashboard/Dashboard';
import { Numpad, SudokuBoard } from './components/board/SudokuBoard';
import { ResultModal } from './components/game/ResultModal';
import { Doodles } from './components/layout/Doodles';
import { TopNav, navItemClass } from './components/layout/TopNav';
import { AlgorithmEvidencePanel } from './components/status/AlgorithmEvidencePanel';
import { BotTimer } from './components/status/BotTimer';
import { HealthBar } from './components/status/HealthBar';
import { ReshapeTimer } from './components/status/ReshapeTimer';
import { AuthPage } from './components/auth/AuthPage';
import { ApiError, discardActiveGame, fetchMe, logOut } from './services/apiClient';
import { connectAndResumeGame, connectAndStartGame, leaveGame, saveAndExit } from './services/socketClient';
import { useAuthStore } from './store/useAuthStore';
import { useGameStore } from './store/useGameStore';
import type { ActiveGame, Progress } from './types/game';
import { emptyProgress } from './utils/progression';
import { formatClock } from './utils/formatTime';

const START_TIMEOUT_MS = 10_000;

type StartKind = 'idle' | 'fresh' | 'restart';

function GameClock() {
  const elapsedMs = useGameStore((state) => state.elapsedMs);
  return (
    <span
      role="timer"
      aria-label="Elapsed time"
      className="flex items-center gap-1.5 font-mono text-2xl font-bold tabular-nums text-ink"
    >
      <Clock3 className="h-5 w-5 text-ink" strokeWidth={2.5} aria-hidden="true" />
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
    <main className="flex min-h-screen items-center justify-center bg-white text-muted">
      <Doodles />
      <p role="status" className="sketch-card relative z-10 animate-pulse px-6 py-4 text-xl">
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
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('play');
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

  const exitToDashboard = useCallback(
    (tab: DashboardTab) => {
      if (useGameStore.getState().gameStatus !== 'PLAYING') {
        setDashboardTab(tab);
        void backToDashboard();
        return;
      }
      if (window.confirm('Save and exit? You can continue this game later from the dashboard.')) {
        setDashboardTab(tab);
        void (async () => {
          await saveAndExit();
          useGameStore.getState().resetGame();
          setStartError(null);
        })();
      }
    },
    [backToDashboard],
  );

  const quit = useCallback(() => exitToDashboard('play'), [exitToDashboard]);
  const openBenchmarkLab = useCallback(() => exitToDashboard('benchmark'), [exitToDashboard]);

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
        tab={dashboardTab}
        onTabChange={setDashboardTab}
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
    <main className="relative min-h-screen bg-white text-ink">
      <Doodles />
      <TopNav asHeading={false}>
        <nav aria-label="Main" className="flex items-center gap-5">
          <span aria-current="page" className={navItemClass(true)}>
            Play
          </span>
          <button type="button" onClick={openBenchmarkLab} className={navItemClass(false)}>
            Benchmark Lab
          </button>
        </nav>
      </TopNav>
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-4 p-3 sm:p-6">
        <ArenaHeader onQuit={quit} />
        {storeError !== null && gameStatus === 'PLAYING' && (
          <div
            role="alert"
            className="flex w-full items-center justify-between gap-3 rounded-xl border-[1.5px] border-ink bg-pale-blush px-4 py-2 text-crimson"
          >
            <span>{storeError}</span>
            <button type="button" onClick={() => void backToDashboard()} className="sketch-btn shrink-0 px-3 py-1 text-sm">
              Back to Dashboard
            </button>
          </div>
        )}
        <div className="grid w-full gap-3 empty:hidden sm:grid-cols-2">
          <HealthBar />
          <BotTimer />
          <ReshapeTimer />
        </div>
        <div className="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
          <SudokuBoard showNumpad={false} className="lg:flex-1" />
          <aside className="flex w-full max-w-[560px] flex-col gap-5 lg:w-80 lg:shrink-0">
            <Numpad />
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
    <header className="sketch-panel flex w-full items-center justify-between gap-3 border-2 border-lavender px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="sketch-pill bg-pale-blush py-0.5">{mode === 'BOT_CHALLENGE' ? 'Bot Challenge' : 'Classic'}</span>
        <span className="sketch-pill py-0.5">{difficulty}</span>
        {isDaily && <span className="sketch-pill bg-doodle-yellow py-0.5">Daily</span>}
        {solverStrategy !== null && (
          <span data-testid="engine-chip" className="sketch-pill bg-doodle-sky py-0.5">
            {solverStrategy === 'NAIVE_ORACLE' ? 'Naive Oracle' : 'Optimized'}
          </span>
        )}
      </div>
      <GameClock />
      {gameStatus === 'PLAYING' ? (
        <button
          type="button"
          onClick={onQuit}
          className="sketch-btn flex items-center gap-1.5 px-3 py-1 text-sm"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Save &amp; Exit
        </button>
      ) : (
        <span className="w-[72px]" aria-hidden="true" />
      )}
    </header>
  );
}

