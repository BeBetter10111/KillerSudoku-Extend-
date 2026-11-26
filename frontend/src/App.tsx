import { Clock3, LogOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dashboard, type GameSetup } from './components/dashboard/Dashboard';
import { SudokuBoard } from './components/board/SudokuBoard';
import { ResultModal } from './components/game/ResultModal';
import { AppHeader, navLinkClass } from './components/layout/AppHeader';
import { Doodles } from './components/layout/Doodles';
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
      className="flex items-center gap-1.5 font-mono text-2xl font-bold tabular-nums text-ink"
    >
      <Clock3 className="h-5 w-5 rounded-full bg-sunny-300 text-ink" aria-hidden="true" />
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
    <main className="flex min-h-screen items-center justify-center bg-paper text-ink-soft">
      <p role="status" className="sketch-card animate-pulse px-6 py-4 text-2xl">
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

  const backToDashboard = useCallback(async () => {
    await leaveGame();
    useGameStore.getState().resetGame();
    setStartError(null);
  }, []);

  const quit = useCallback(() => {
    if (window.confirm('Leave this game? Your progress will be lost.')) {
      void backToDashboard();
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
      />
    );
  }

  return (
    <main className="relative min-h-screen bg-paper text-ink">
      <Doodles />
      <AppHeader>
        <nav aria-label="Game" className="flex items-center gap-5 sm:gap-7">
          <span aria-current="page" className={navLinkClass(true)}>
            Play
          </span>
          {gameStatus === 'PLAYING' && (
            <button type="button" onClick={quit} className={navLinkClass(false)}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Quit
            </button>
          )}
        </nav>
      </AppHeader>
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-4 px-3 py-5 sm:px-6 sm:py-6">
        {storeError !== null && gameStatus === 'PLAYING' && (
          <div
            role="alert"
            className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2 text-red-700"
          >
            <span>{storeError}</span>
            <button type="button" onClick={() => void backToDashboard()} className="sketch-btn shrink-0 px-3 py-1 text-sm">
              Back to Dashboard
            </button>
          </div>
        )}
        <GameInfoBar />
        <div className="flex w-full flex-wrap items-center gap-2.5 empty:hidden">
          <HealthBar />
          <BotTimer />
          <ReshapeTimer />
        </div>
        <SudokuBoard
          aside={
            <aside aria-label="Algorithm sidebar">
              <AlgorithmEvidencePanel />
            </aside>
          }
        />
      </div>
      {(gameStatus === 'WON' || gameStatus === 'LOST') && (
        <ConnectedResultModal onPlayAgain={playAgain} onBackToDashboard={() => void backToDashboard()} />
      )}
    </main>
  );
}

const CHIP = 'rounded-full border-2 px-3 py-0.5 text-base';

function GameInfoBar() {
  const mode = useGameStore((state) => state.mode);
  const difficulty = useGameStore((state) => state.difficulty);
  const seed = useGameStore((state) => state.seed);
  const solverStrategy = useGameStore((state) => state.solverStrategy);
  const isDaily = seed !== null && seed.startsWith('daily-');

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`${CHIP} border-ink bg-blush-100`}>{mode === 'BOT_CHALLENGE' ? 'Bot Challenge' : 'Classic'}</span>
        <span className={`${CHIP} border-ink bg-white`}>
          {difficulty !== null ? difficulty.charAt(0) + difficulty.slice(1).toLowerCase() : ''}
        </span>
        {isDaily && <span className={`${CHIP} border-sunny-500 bg-sunny-100 text-amber-900`}>Daily</span>}
        {solverStrategy !== null && (
          <span data-testid="engine-chip" className={`${CHIP} border-lilac-300 bg-lilac-50 text-lilac-600`}>
            {solverStrategy === 'NAIVE_ORACLE' ? 'Naive Oracle' : 'Optimized'}
          </span>
        )}
      </div>
      <GameClock />
    </div>
  );
}
