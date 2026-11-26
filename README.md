# Killer Sudoku

Single-player Killer Sudoku web game with a **client-server authoritative** architecture.
The server owns the puzzle solution, validates every move, runs the timers and enemy mechanics,
and pushes state to a thin React client over WebSocket (STOMP).

- **Backend:** Java 17, Spring Boot 3.2 (`spring-boot-starter-web`, `-websocket`), Lombok, Jackson
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, `@stomp/stompjs`, `lucide-react`

## Game modes

| Mode | Difficulty | Rules |
|---|---|---|
| `CLASSIC` | EASY / MEDIUM / HARD | 3 lives, no modifiers |
| `BOT_CHALLENGE` | EASY | Bot (-15 HP per timeout) + shared HP, wrong number -10 HP |
| `BOT_CHALLENGE` | MEDIUM | Bot (-25 HP per timeout) + shared HP, wrong number -15 HP |
| `BOT_CHALLENGE` | HARD | Bot (-30 HP per timeout), wrong number -20 HP, plus a Cage Reshape every 5 minutes |

**Wrong and correct numbers.** A correct number is shown in blue and costs nothing. A wrong number is written into the
cell in red and costs one life in `CLASSIC` (3 lives, the game is lost at 0) or HP in `BOT_CHALLENGE` (100 HP, lost at 0).
A red cell can be overwritten with another number (a different wrong number costs again; the same one is ignored). Each
wrong number also adds 5 s to the final time (`GameSession.WRONG_ANSWER_PENALTY_MS`).

**Bot.** The bot is visible from the first second, standing on an empty cell. Its first countdown is 2 minutes (`EASY` /
`MEDIUM`) or 3 minutes (`HARD`); every countdown after that is 45 s (`EASY`), 50 s (`MEDIUM`) or 60 s (`HARD`). Solving
its cell makes it jump to a new empty cell; each consecutive jump shortens the countdown by 10 % (floor: 5 s). When the
countdown reaches zero HP is deducted and the bot moves to another empty cell. It switches off when fewer than 2 empty
cells remain or HP reaches 0.

**Hard board.** In every mode `HARD` starts with no given numbers; the player solves from the cages alone.

**Cage Reshape (`BOT_CHALLENGE` + `HARD` only).** Every 300 000 ms the cages are regrouped (Union-Find + backtracking).
Filled values are kept and the puzzle is guaranteed to still have a unique solution. An `ALERT_WARNING` is sent 10 s
before, and every `TICK` carries `reshapeRemainingMs`, shown in the HUD as "Cages reshape in m:ss". If no new unique
layout is found the server retries after 5 s. To see a reshape quickly, start the backend with
`GAME_RESHAPE_INTERVAL_MS=30000` (docker compose: `RESHAPE_INTERVAL_MS=30000 docker compose up --build`); `0` keeps the
5-minute default.

**Daily Seed Challenge.** `GET /api/daily-seed` returns `daily-YYYY-MM-DD` (UTC). Starting a game with that seed gives
everyone the same puzzle. A win is replayed on a fresh seeded session by `ServerReplayValidator`
(every move, timestamp and the final time must match) before it is stored in the in-memory leaderboard.

## Run it

### Docker (recommended)

Requirements: Docker with the Compose plugin.

```bash
docker compose up --build
```

Open http://localhost:3000. The `frontend` container (nginx) serves the built UI and proxies `/api` and `/ws-game`
to the `backend` container; it starts only after the backend health check passes. The backend API is also published
on http://localhost:8080. Override the ports with `FRONTEND_PORT` / `BACKEND_PORT`
(for example `FRONTEND_PORT=8088 docker compose up --build`). Stop with `docker compose down`.

### Local development

Requirements: JDK 17+, Maven 3.6.3+, Node 18+.

```bash
# terminal 1 - backend on :8080
cd backend
mvn spring-boot:run

# terminal 2 - frontend on :5173
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

Configuration:

| Setting | Where | Default |
|---|---|---|
| Allowed CORS origins / methods | `backend/src/main/resources/application.yml` (`app.cors.*`) | `http://localhost:5173`, `GET,POST,OPTIONS` |
| WebSocket URL | `VITE_WS_URL` | derived from the page: `ws(s)://<page host>/ws-game/websocket` (Vite proxies `/ws-game` to `localhost:8080`) |
| REST base URL | `VITE_API_URL` | empty = same origin (Vite proxies `/api` to `localhost:8080`) |

(`/ws-game/websocket` is the raw WebSocket transport of the SockJS-enabled `/ws-game` endpoint.)

## Tests and builds

```bash
cd backend  && mvn test            # domain, algorithms, modifiers, session, replay validator, leaderboard, DTO contract
cd frontend && npm test            # store, socket client (mock STOMP server), components, dashboard, app
cd frontend && npm run build       # tsc --noEmit + vite build
```

## Dashboard and Benchmark Lab

The home screen has two tabs. **Play Game** picks the mode, difficulty, solver engine (`OPTIMIZED_MRV_PRUNING` or
`NAIVE_ORACLE`), the Daily Seed toggle and shows the leaderboard. **Algorithm Benchmark Lab** runs
`POST /api/benchmark/run` for 100 / 500 / 1000 puzzles of a chosen difficulty and shows both solvers side by side
(p50 / p95 latency, average nodes, pruned branches, peak allocated RAM, bitmask overhead, node reduction, speedups and
the oracle correctness check) with comparison bars. Three more tabs cover scaling and correctness:

- **Clue-Density Scaling (9x9)**: 35, 20, 10 and 0 givens (`POST /api/benchmark/clue-density`).
- **Grid-Size (N x N) Scaling**: 4x4, 9x9 and 16x16 with about 40% givens (`POST /api/benchmark/grid-size`).
- **Edge-Case Correctness Suite**: six mandatory cases (`POST /api/benchmark/edge-cases`).

Both scaling endpoints take `{ samplesPerCondition?, seedPrefix? }` (1-50, default 10). Every solve is capped at
1 000 000 nodes; capped runs are lower bounds and are reported as "over budget". Results from every tab can be exported
with **Download CSV / JSON Report Data** (CSV is long format: `report,condition,solver,metric,value`).

## Solver internals

`OptimizedBacktrackingSolver` supports 4x4, 9x9 and 16x16 grids (box size 2, 3 or 4). It tracks `rowMask`, `colMask`,
`boxMask` and `cageMask` as integer bitmasks together with each cage's running sum and empty-cell count, so every
candidate check is a handful of bitwise operations. Cells are chosen by minimum remaining values (ties broken by the
cage with the fewest empty cells), with forward checking and cage-sum bound pruning from precomputed min/max-sum
tables. `AlgorithmMetrics.bitmaskOverheadBytes` is the exact size of the per-solve bitmask and counter arrays
(16-byte array header plus 4 bytes per element, 8-byte aligned); the shared lookup tables are reported separately
(`OptimizedBacktrackingSolver.lookupTableBytes`: 432 B for 4x4, 20 856 B for 9x9, 4 457 520 B for 16x16).
`NaiveBacktrackingSolver` keeps no bitmasks. Both solvers accept an optional node budget.

## Algorithm evidence

Every solve, puzzle generation and cage reshape can report `AlgorithmMetrics` (`strategyUsed`, `operationType`,
`executionTimeMs`, `nodesVisited`, `prunedBranches`, `unionFindOps`, `memoryBytes`, `oracleVerified`).
`nodesVisited` / `prunedBranches` count solver work only; the cage partitioner reports its Disjoint Set work as
`unionFindOps` (every `find`, `union` and rollback step). `memoryBytes` is the heap allocated by the calling thread
during the operation. `NAIVE_ORACLE` is plain row-major backtracking and never prunes; generators cross-check every
uniqueness result against it (bounded at 1 000 000 nodes - if the budget runs out `oracleVerified` is `false`, never
a wrong answer). `CAGE_RESHAPED` carries `{ cages, metrics }`.

In the game screen the `AlgorithmEvidencePanel` sidebar shows the latest metrics (strategy, operation, time, nodes,
pruned branches, Union-Find ops, memory in KB, oracle badge) and a short run history that updates on every
`GAME_STARTED` / `CAGE_RESHAPED` event.

## Protocol

STOMP endpoint `/ws-game` (SockJS fallback), application prefix `/app`, broker `/topic`, `/queue`.

| Direction | Destination | Body |
|---|---|---|
| client -> server | `/app/game/{sessionId}/start` | `{ mode, difficulty, seed?, playerName?, solverStrategy? }` |
| client -> server | `/app/game/{sessionId}/submit` | `{ row, col, value }` |
| client -> server | `/app/game/{sessionId}/forfeit` | empty |
| server -> client | `/topic/game/{sessionId}` | `{ type, sessionId, timestamp, payload, metrics }` |

The client chooses the `sessionId` (8-64 chars of `[A-Za-z0-9_-]`) and must **subscribe before it sends `start`**.

Event types: `GAME_STARTED` (full board state), `CELL_UPDATED`, `MOVE_REJECTED`, `BOT_UPDATED`, `HP_CHANGED`,
`ALERT_WARNING`, `CAGE_RESHAPED` (`{ cages, metrics }`), `TICK` (every 250 ms), `GAME_WON`, `GAME_LOST`, `ERROR`.
The hidden bot's position and the solution are never sent to the client. TypeScript mirrors live in
`frontend/src/types/game.ts`.

`solverStrategy` is `NAIVE_ORACLE` or `OPTIMIZED_MRV_PRUNING` (default). The same seed yields a different puzzle per
strategy, so daily-seed games are always forced to `OPTIMIZED_MRV_PRUNING` and the replay validator replays a win with
the strategy the session used. `metrics` is `null` except on `GAME_STARTED` (puzzle generation) and `CAGE_RESHAPED`.

REST: `GET /api/daily-seed`, `GET /api/leaderboard?date=&mode=&difficulty=&limit=`,
`POST /api/benchmark/run` with `{ difficulty, batchSize?, seedPrefix? }` (`batchSize` 1-1000, default 100). It generates
`batchSize` puzzles, solves each with both solvers and returns, per solver, `p50LatencyMs`, `p95LatencyMs`,
`avgNodesVisited`, `avgPrunedBranches`, `peakMemoryBytes`, plus `nodeReductionPercent` and `oracleAgreementPercent`
(optimized solution == oracle solution == generated solution). Runs are synchronous (1 000 HARD puzzles take about 25 s)
and one at a time; a concurrent call gets HTTP 429.

## Architecture

```
backend/src/main/java/com/killer/sudoku
  model/        Board, Cell, Cage, Position, BotEntity, PlayerHealth, enums   (pure domain)
  algorithm/    SudokuSolver (interface) -> NaiveBacktrackingSolver (reference oracle),
                OptimizedBacktrackingSolver (MRV + forward checking + cage-sum bounds),
                BacktrackingCageGenerator, PuzzleGenerator, WeightedRandomBotStrategy,
                UnionFind                                                      (pure, stateless, seedable)
  modifier/     GameModifier (Strategy) -> BotModifier, CageReshapeModifier
  config/       GameBalanceConfig (presets), DifficultyConfig (modifier factory)
  service/      TimerService, BenchmarkService (naive vs optimized, p50/p95)
  core/         GameSession (orchestrator), GameEventListener (Observer), GameSessionFactory
  server/       WebSocket config, protocol DTOs, WebSocketEventListener,
                SingleGameController, ServerReplayValidator, DailyLeaderboard, LeaderboardController
```

`GameSession` only knows `GameEventListener`; the WebSocket layer is one implementation of it. New mechanics are
added as new `GameModifier`s without touching the session.

## Known limitations

- No authentication: the session id is the only capability, and leaderboard names are unverified.
- Sessions and the leaderboard live in memory and are lost on restart.
- Closing the tab without using Quit/Back does not end the session; it expires after 2 hours (max 500 active sessions).
- All sessions are ticked from one scheduler thread; the client does not auto-reconnect.
