import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket as NodeWebSocket, WebSocketServer } from 'ws';
import type { AddressInfo } from 'node:net';

(globalThis as unknown as { WebSocket: unknown }).WebSocket = NodeWebSocket;

interface Frame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

function parseFrames(raw: string): Frame[] {
  return raw
    .split('\0')
    .map((chunk) => chunk.replace(/^\n+/, ''))
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const [head, ...rest] = chunk.split('\n\n');
      const [command, ...headerLines] = head.split('\n');
      const headers: Record<string, string> = {};
      for (const line of headerLines) {
        const idx = line.indexOf(':');
        if (idx > 0) {
          headers[line.slice(0, idx)] = line.slice(idx + 1);
        }
      }
      return { command, headers, body: rest.join('\n\n') };
    });
}

function frame(command: string, headers: Record<string, string>, body = ''): string {
  const headerText = Object.entries(headers)
    .map(([key, value]) => `${key}:${value}`)
    .join('\n');
  return `${command}\n${headerText}\n\n${body}\0`;
}

const boardState = {
  sessionId: '',
  seed: 'abc',
  mode: 'CLASSIC',
  difficulty: 'EASY',
  cells: Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => ({ row, col, currentValue: 0, given: false, solved: false })),
  ),
  cages: [],
  emptyCellsCount: 81,
  playerHealth: null,
  bot: null,
};

let server: WebSocketServer;
let port: number;
let respondToReceipts = true;
let received: Frame[] = [];
let activeSockets: NodeWebSocket[] = [];

const generationMetrics = (strategyUsed: string) => ({
  strategyUsed,
  operationType: 'PUZZLE_GEN',
  executionTimeMs: 2.5,
  nodesVisited: 60,
  prunedBranches: 25,
  unionFindOps: 300,
  memoryBytes: 8192,
  oracleVerified: true,
});

function pushEvent(
  socket: NodeWebSocket,
  subscriptionId: string,
  sessionId: string,
  type: string,
  payload: unknown,
  metrics: unknown = null,
) {
  const body = JSON.stringify({ type, sessionId, timestamp: 1, payload, metrics });
  socket.send(frame('MESSAGE', {
    subscription: subscriptionId,
    destination: `/topic/game/${sessionId}`,
    'message-id': `m-${Math.random()}`,
  }, body));
}

beforeAll(async () => {
  server = new WebSocketServer({ port: 0 });
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  port = (server.address() as AddressInfo).port;
  vi.stubEnv('VITE_WS_URL', `ws://127.0.0.1:${port}/`);

  server.on('connection', (socket) => {
    activeSockets.push(socket);
    const subscriptions = new Map<string, string>();
    socket.on('message', (data) => {
      for (const incoming of parseFrames(data.toString())) {
        received.push(incoming);
        switch (incoming.command) {
          case 'CONNECT':
          case 'STOMP':
            socket.send(frame('CONNECTED', { version: '1.2', 'heart-beat': '0,0' }));
            break;
          case 'SUBSCRIBE':
            subscriptions.set(incoming.headers['destination'], incoming.headers['id']);
            if (respondToReceipts && incoming.headers['receipt']) {
              socket.send(frame('RECEIPT', { 'receipt-id': incoming.headers['receipt'] }));
            }
            break;
          case 'SEND': {
            const match = /^\/app\/game\/([^/]+)\/(start|submit)$/.exec(incoming.headers['destination']);
            if (!match) {
              break;
            }
            const [, sessionId, action] = match;
            const subscriptionId = subscriptions.get(`/topic/game/${sessionId}`);
            if (subscriptionId === undefined) {
              break;
            }
            if (action === 'start') {
              const request = JSON.parse(incoming.body);
              const strategy = request.seed === 'forced' ? 'OPTIMIZED_MRV_PRUNING' : request.solverStrategy;
              pushEvent(socket, subscriptionId, sessionId, 'GAME_STARTED', { ...boardState, sessionId },
                generationMetrics(strategy));
            } else {
              const { row, col, value } = JSON.parse(incoming.body);
              pushEvent(socket, subscriptionId, 'someone-else', 'CELL_UPDATED', {
                position: { row: 8, col: 8 }, value: 1, correct: true,
              });
              pushEvent(socket, subscriptionId, sessionId, 'CELL_UPDATED', {
                position: { row, col }, value, correct: true,
              });
            }
            break;
          }
          case 'DISCONNECT':
            if (incoming.headers['receipt']) {
              socket.send(frame('RECEIPT', { 'receipt-id': incoming.headers['receipt'] }));
            }
            break;
          default:
            break;
        }
      }
    });
  });
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  respondToReceipts = true;
  received = [];
  activeSockets = [];
});

afterEach(async () => {
  const { disconnect } = await import('./socketClient');
  await disconnect();
});

async function load() {
  const socket = await import('./socketClient');
  const { useGameStore } = await import('../store/useGameStore');
  return { ...socket, useGameStore };
}

const waitFor = async (predicate: () => boolean, timeoutMs = 2000): Promise<void> => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe('socketClient', () => {
  it('subscribes first, then starts the game and feeds events into the store', async () => {
    const { connectAndStartGame, submitCell, useGameStore } = await load();

    const sessionId = await connectAndStartGame('CLASSIC', 'EASY', 'NAIVE_ORACLE', 'abc', 'Frog');
    await waitFor(() => received.some((f) => f.command === 'SEND'));

    const subscribeIndex = received.findIndex((f) => f.command === 'SUBSCRIBE');
    const startIndex = received.findIndex((f) => f.command === 'SEND');
    expect(subscribeIndex).toBeGreaterThanOrEqual(0);
    expect(startIndex).toBeGreaterThan(subscribeIndex);
    expect(received[subscribeIndex].headers['destination']).toBe(`/topic/game/${sessionId}`);
    expect(received[startIndex].headers['destination']).toBe(`/app/game/${sessionId}/start`);
    expect(JSON.parse(received[startIndex].body)).toEqual({
      mode: 'CLASSIC', difficulty: 'EASY', seed: 'abc', playerName: 'Frog', solverStrategy: 'NAIVE_ORACLE',
    });

    await waitFor(() => useGameStore.getState().gameStatus === 'PLAYING');
    expect(useGameStore.getState().sessionId).toBe(sessionId);

    expect(submitCell(2, 3, 7)).toBe(true);
    await waitFor(() => useGameStore.getState().grid[2]?.[3]?.currentValue === 7);
    expect(useGameStore.getState().grid[8][8].currentValue).toBe(0);
    const submit = received.filter((f) => f.command === 'SEND').pop();
    expect(submit?.headers['destination']).toBe(`/app/game/${sessionId}/submit`);
    expect(JSON.parse(submit?.body ?? '{}')).toEqual({ row: 2, col: 3, value: 7 });
  });

  it('still starts when the broker never answers the subscribe receipt', async () => {
    respondToReceipts = false;
    const { connectAndStartGame, useGameStore } = await load();

    await connectAndStartGame('BOT_CHALLENGE', 'HARD', 'OPTIMIZED_MRV_PRUNING');

    await waitFor(() => useGameStore.getState().gameStatus === 'PLAYING');
    const start = received.find((f) => f.command === 'SEND');
    expect(JSON.parse(start?.body ?? '{}')).toEqual({
      mode: 'BOT_CHALLENGE', difficulty: 'HARD', solverStrategy: 'OPTIMIZED_MRV_PRUNING',
    });
  });

  it('refuses to submit when there is no active connection', async () => {
    const { connectAndStartGame, submitCell, disconnect } = await load();
    expect(submitCell(0, 0, 1)).toBe(false);

    await connectAndStartGame('CLASSIC', 'EASY', 'OPTIMIZED_MRV_PRUNING');
    await disconnect();
    expect(submitCell(0, 0, 1)).toBe(false);
  });

  it('forfeits a running game on leave and then closes the connection', async () => {
    const { connectAndStartGame, leaveGame, submitCell, useGameStore } = await load();
    const sessionId = await connectAndStartGame('CLASSIC', 'EASY', 'OPTIMIZED_MRV_PRUNING');
    await waitFor(() => useGameStore.getState().gameStatus === 'PLAYING');

    await leaveGame();

    const forfeit = received.find((f) => f.headers['destination'] === `/app/game/${sessionId}/forfeit`);
    expect(forfeit?.command).toBe('SEND');
    expect(submitCell(0, 0, 1)).toBe(false);
  });

  it('does not forfeit when the game is already over', async () => {
    const { connectAndStartGame, leaveGame, useGameStore } = await load();
    await connectAndStartGame('CLASSIC', 'EASY', 'OPTIMIZED_MRV_PRUNING');
    await waitFor(() => useGameStore.getState().gameStatus === 'PLAYING');
    useGameStore.setState({ gameStatus: 'WON' });

    await leaveGame();

    expect(received.some((f) => (f.headers['destination'] ?? '').endsWith('/forfeit'))).toBe(false);
  });

  it('starts a fresh game on a new connection and resets the previous state', async () => {
    const { connectAndStartGame, useGameStore } = await load();
    const first = await connectAndStartGame('CLASSIC', 'EASY', 'OPTIMIZED_MRV_PRUNING');
    await waitFor(() => useGameStore.getState().sessionId === first);

    const second = await connectAndStartGame('CLASSIC', 'MEDIUM', 'OPTIMIZED_MRV_PRUNING');
    await waitFor(() => useGameStore.getState().sessionId === second);

    expect(second).not.toBe(first);
    expect(useGameStore.getState().gameStatus).toBe('PLAYING');
  });

  it('reports a lost connection while a game is running', async () => {
    const { connectAndStartGame, useGameStore } = await load();
    await connectAndStartGame('CLASSIC', 'EASY', 'OPTIMIZED_MRV_PRUNING');
    await waitFor(() => useGameStore.getState().gameStatus === 'PLAYING');

    activeSockets.forEach((socket) => socket.terminate());

    await waitFor(() => useGameStore.getState().errorMessage !== null);
    expect(useGameStore.getState().errorMessage).toMatch(/lost/i);
  });

  it('rejects and records an error when the server is unreachable', async () => {
    vi.stubEnv('VITE_WS_URL', 'ws://127.0.0.1:1/');
    vi.resetModules();
    const { connectAndStartGame, useGameStore } = await load();

    await expect(connectAndStartGame('CLASSIC', 'EASY', 'OPTIMIZED_MRV_PRUNING')).rejects.toThrow();
    expect(useGameStore.getState().errorMessage).not.toBeNull();
    vi.stubEnv('VITE_WS_URL', `ws://127.0.0.1:${port}/`);
    vi.resetModules();
  });
  it('records the strategy the server actually used and the generation metrics', async () => {
    const { connectAndStartGame, useGameStore } = await load();

    await connectAndStartGame('CLASSIC', 'EASY', 'NAIVE_ORACLE', 'plain');
    await waitFor(() => useGameStore.getState().gameStatus === 'PLAYING');
    expect(useGameStore.getState().solverStrategy).toBe('NAIVE_ORACLE');
    expect(useGameStore.getState().latestMetrics?.operationType).toBe('PUZZLE_GEN');
    expect(useGameStore.getState().metricsHistory).toHaveLength(1);

    await connectAndStartGame('CLASSIC', 'EASY', 'NAIVE_ORACLE', 'forced');
    await waitFor(() => useGameStore.getState().latestMetrics?.strategyUsed === 'OPTIMIZED_MRV_PRUNING');
    expect(useGameStore.getState().solverStrategy).toBe('OPTIMIZED_MRV_PRUNING');
    expect(useGameStore.getState().metricsHistory).toHaveLength(1);
  });

  it('builds the WebSocket URL from the page location unless overridden', async () => {
    vi.stubEnv('VITE_WS_URL', '');
    vi.resetModules();
    const { resolveWebSocketUrl } = await import('./socketClient');
    expect(resolveWebSocketUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe(
      'ws://localhost:5173/ws-game/websocket',
    );
    expect(resolveWebSocketUrl({ protocol: 'https:', host: 'sudoku.example.com' })).toBe(
      'wss://sudoku.example.com/ws-game/websocket',
    );
    vi.stubEnv('VITE_WS_URL', `ws://127.0.0.1:${port}/`);
    vi.resetModules();
    const overridden = await import('./socketClient');
    expect(overridden.resolveWebSocketUrl({ protocol: 'https:', host: 'ignored' })).toBe(
      `ws://127.0.0.1:${port}/`,
    );
  });
});
