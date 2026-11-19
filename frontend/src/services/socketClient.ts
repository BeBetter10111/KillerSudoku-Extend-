import { Client, type IMessage } from '@stomp/stompjs';
import { useGameStore } from '../store/useGameStore';
import type {
  Difficulty,
  GameEventMessage,
  GameMode,
  SolverStrategyType,
  StartGameRequest,
  SubmitCellRequest,
} from '../types/game';

const WS_PATH = '/ws-game/websocket';
const SUBSCRIPTION_RECEIPT_TIMEOUT_MS = 300;
const FORFEIT_FLUSH_MS = 150;

let client: Client | null = null;
let activeSessionId: string | null = null;
let attempt = 0;
let startTimer: ReturnType<typeof setTimeout> | null = null;
let cancelPending: (() => void) | null = null;

export function resolveWebSocketUrl(location?: Pick<Location, 'protocol' | 'host'>): string {
  const override: string | undefined = import.meta.env.VITE_WS_URL;
  if (override) {
    return override;
  }
  const { protocol, host } = location ?? window.location;
  const scheme = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${host}${WS_PATH}`;
}

function newSessionId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isGameEvent(value: unknown): value is GameEventMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'sessionId' in value &&
    'payload' in value
  );
}

function dispatchMessage(message: IMessage, sessionId: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.body);
  } catch {
    return;
  }
  if (isGameEvent(parsed) && parsed.sessionId === sessionId) {
    useGameStore.getState().handleServerEvent(parsed);
  }
}

export function connectAndStartGame(
  mode: GameMode,
  difficulty: Difficulty,
  solverStrategy: SolverStrategyType,
  seed?: string,
  playerName?: string,
): Promise<string> {
  return disconnect().then(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({ solverStrategy });

    const sessionId = newSessionId();
    const request: StartGameRequest = { mode, difficulty, seed, playerName, solverStrategy };
    const thisAttempt = ++attempt;
    const isCurrent = (): boolean => attempt === thisAttempt;

    return new Promise<string>((resolve, reject) => {
      let started = false;
      let settled = false;

      const settle = (action: () => void): void => {
        if (!settled) {
          settled = true;
          cancelPending = null;
          action();
        }
      };

      const fail = (message: string): void => {
        if (!isCurrent()) {
          return;
        }
        useGameStore.setState({ errorMessage: message });
        settle(() => reject(new Error(message)));
      };

      function begin(): void {
        if (started || !isCurrent()) {
          return;
        }
        started = true;
        if (startTimer !== null) {
          clearTimeout(startTimer);
          startTimer = null;
        }
        stomp.publish({ destination: `/app/game/${sessionId}/start`, body: JSON.stringify(request) });
        settle(() => resolve(sessionId));
      }

      const stomp = new Client({
        brokerURL: resolveWebSocketUrl(),
        reconnectDelay: 0,
        onConnect: () => {
          if (!isCurrent()) {
            return;
          }
          const receiptId = `subscribed-${sessionId}`;
          stomp.watchForReceipt(receiptId, begin);
          stomp.subscribe(`/topic/game/${sessionId}`, (message) => dispatchMessage(message, sessionId), {
            receipt: receiptId,
          });
          startTimer = setTimeout(begin, SUBSCRIPTION_RECEIPT_TIMEOUT_MS);
        },
        onStompError: (frame) => fail(frame.headers['message'] ?? 'STOMP protocol error'),
        onWebSocketError: () => fail('Cannot reach the game server'),
        onWebSocketClose: () => {
          if (useGameStore.getState().gameStatus === 'PLAYING' || !settled) {
            fail('Connection to the game server was lost');
          }
        },
      });

      cancelPending = () => settle(() => reject(new Error('Connection cancelled')));
      client = stomp;
      activeSessionId = sessionId;
      stomp.activate();
    });
  });
}

export function submitCell(row: number, col: number, value: number): boolean {
  if (client === null || !client.connected || activeSessionId === null) {
    return false;
  }
  const body: SubmitCellRequest = { row, col, value };
  client.publish({ destination: `/app/game/${activeSessionId}/submit`, body: JSON.stringify(body) });
  return true;
}

export async function leaveGame(): Promise<void> {
  if (
    client !== null &&
    client.connected &&
    activeSessionId !== null &&
    useGameStore.getState().gameStatus === 'PLAYING'
  ) {
    client.publish({ destination: `/app/game/${activeSessionId}/forfeit`, body: '' });
    await new Promise<void>((resolve) => setTimeout(resolve, FORFEIT_FLUSH_MS));
  }
  await disconnect();
}

export async function disconnect(): Promise<void> {
  attempt += 1;
  if (startTimer !== null) {
    clearTimeout(startTimer);
    startTimer = null;
  }
  const pending = cancelPending;
  cancelPending = null;
  pending?.();
  const current = client;
  client = null;
  activeSessionId = null;
  if (current !== null) {
    await current.deactivate();
  }
}
