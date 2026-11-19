package com.killer.sudoku.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.support.RecordingListener;
import com.killer.sudoku.support.TestSessions;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class GameSessionTest {

    private final GameSessionFactory factory = TestSessions.factory();

    private GameSession session(GameMode mode, Difficulty difficulty, String seed, RecordingListener listener) {
        GameSession session = factory.create("session-" + seed, mode, difficulty, seed, "tester");
        session.addListener(listener);
        return session;
    }

    @Test
    void startEmitsInitStateFirstAndFoldsInitialBotIntoSnapshot() {
        RecordingListener listener = new RecordingListener();
        GameSession session = session(GameMode.BOT_CHALLENGE, Difficulty.MEDIUM, "start", listener);
        session.start();
        session.start();

        assertEquals(List.of("INIT"), listener.types());
        assertTrue(session.getBot().isPresent());
        assertFalse(session.getBot().get().isRevealed());
    }

    @Test
    void classicSessionHasNoBot() {
        GameSession session = session(GameMode.CLASSIC, Difficulty.EASY, "classic", new RecordingListener());
        session.start();
        assertTrue(session.getBot().isEmpty());
    }

    @Test
    void correctSubmissionPlacesCellNotifiesAndIsLogged() {
        RecordingListener listener = new RecordingListener();
        GameSession session = session(GameMode.CLASSIC, Difficulty.MEDIUM, "correct", listener);
        session.start();
        Position target = session.getBoard().getEmptyCells().get(0);
        Cell cell = session.getBoard().getCell(target);
        session.tick(GameSession.TICK_MS);

        assertEquals(MoveResult.CORRECT, session.submitValue(target, cell.getSolutionValue()));

        assertTrue(cell.isSolved());
        assertEquals(cell.getSolutionValue(), cell.getCurrentValue());
        RecordingListener.CellUpdate update = (RecordingListener.CellUpdate) listener.last("CELL").data();
        assertTrue(update.correct());
        MoveRecord record = session.getReplayLog().get(0);
        assertEquals(target, record.position());
        assertEquals(GameSession.TICK_MS, record.elapsedMs());
        assertTrue(record.correct());
    }

    @Test
    void wrongSubmissionLeavesCellEmptyAddsTimePenaltyAndIsLogged() {
        RecordingListener listener = new RecordingListener();
        GameSession session = session(GameMode.CLASSIC, Difficulty.MEDIUM, "wrong", listener);
        session.start();
        Position target = session.getBoard().getEmptyCells().get(0);
        Cell cell = session.getBoard().getCell(target);
        int wrong = cell.getSolutionValue() % 9 + 1;

        assertEquals(MoveResult.INCORRECT, session.submitValue(target, wrong));

        assertTrue(cell.isEmpty());
        assertEquals(GameSession.WRONG_ANSWER_PENALTY_MS, session.getPenaltyMs());
        assertEquals(GameSession.WRONG_ANSWER_PENALTY_MS, session.getTotalTimeMs());
        assertFalse(((RecordingListener.CellUpdate) listener.last("CELL").data()).correct());
        assertFalse(session.getReplayLog().get(0).correct());
        assertEquals(MoveResult.CORRECT, session.submitValue(target, cell.getSolutionValue()));
    }

    @Test
    void rejectsInvalidSubmissionsWithoutLoggingThem() {
        GameSession session = session(GameMode.CLASSIC, Difficulty.EASY, "reject", new RecordingListener());
        Position anyEmpty = session.getBoard().getEmptyCells().get(0);
        assertEquals(MoveResult.REJECTED, session.submitValue(anyEmpty, 1));

        session.start();
        Position given = null;
        for (int r = 0; r < 9 && given == null; r++) {
            for (int c = 0; c < 9; c++) {
                if (session.getBoard().getCell(r, c).isGiven()) {
                    given = new Position(r, c);
                    break;
                }
            }
        }
        assertNotNull(given);
        assertEquals(MoveResult.REJECTED, session.submitValue(given, 5));
        assertEquals(MoveResult.REJECTED, session.submitValue(anyEmpty, 0));
        assertEquals(MoveResult.REJECTED, session.submitValue(anyEmpty, 10));
        TestSessions.solve(session, anyEmpty);
        assertEquals(MoveResult.REJECTED, session.submitValue(anyEmpty, session.getBoard().getCell(anyEmpty).getSolutionValue()));
        assertEquals(1, session.getReplayLog().size());
    }

    @Test
    void tickIsIgnoredUntilStartedAndReportsTotalTimeIncludingPenalty() {
        RecordingListener listener = new RecordingListener();
        GameSession session = session(GameMode.CLASSIC, Difficulty.EASY, "tick", listener);
        session.tick(GameSession.TICK_MS);
        assertEquals(0, session.getElapsedMs());

        session.start();
        Position target = session.getBoard().getEmptyCells().get(0);
        session.submitValue(target, session.getBoard().getCell(target).getSolutionValue() % 9 + 1);
        session.tick(GameSession.TICK_MS);

        assertEquals(GameSession.TICK_MS, session.getElapsedMs());
        assertEquals(GameSession.TICK_MS + GameSession.WRONG_ANSWER_PENALTY_MS, listener.last("TICK").data());
    }

    @Test
    void solvingEveryCellWinsExactlyOnceAndFreezesTheSession() {
        RecordingListener listener = new RecordingListener();
        GameSession session = session(GameMode.CLASSIC, Difficulty.HARD, "win", listener);
        session.start();
        session.tick(GameSession.TICK_MS * 4);
        for (Position position : session.getBoard().getEmptyCells()) {
            TestSessions.solve(session, position);
        }

        assertTrue(session.isFinished());
        assertTrue(session.isWon());
        assertEquals(GameSession.REASON_COMPLETED, session.getEndReason());
        assertEquals(GameSession.TICK_MS * 4, session.getFinalTimeMs());
        assertEquals(1, listener.count("OVER"));
        RecordingListener.GameOver over = (RecordingListener.GameOver) listener.last("OVER").data();
        assertTrue(over.won());

        long ticksBefore = listener.count("TICK");
        session.tick(GameSession.TICK_MS);
        assertEquals(ticksBefore, listener.count("TICK"));
        assertEquals(GameSession.TICK_MS * 4, session.getElapsedMs());
        assertEquals(MoveResult.REJECTED, session.submitValue(new Position(0, 0), 1));
    }

    @Test
    void repeatedBotTimeoutsDepleteHpAndLoseTheGame() {
        RecordingListener listener = new RecordingListener();
        GameSession session = session(GameMode.BOT_CHALLENGE, Difficulty.MEDIUM, "hp", listener);
        session.start();
        int guard = 0;
        while (!session.isFinished() && guard++ < 10_000) {
            BotEntity bot = session.getBot().orElseThrow();
            if (bot.isActive() && !bot.isRevealed()) {
                TestSessions.solve(session, bot.getPosition());
            } else {
                session.tick(GameSession.TICK_MS);
            }
        }

        assertTrue(session.isFinished());
        assertFalse(session.isWon());
        assertEquals(GameSession.REASON_HP_DEPLETED, session.getEndReason());
        assertTrue(session.getPlayerHealth().isDead());
        assertEquals(1, listener.count("OVER"));
        assertEquals(4, listener.count("HP"));
    }

    @Test
    void forfeitEndsRunningGameOnce() {
        RecordingListener listener = new RecordingListener();
        GameSession session = session(GameMode.CLASSIC, Difficulty.EASY, "forfeit", listener);
        session.forfeit("EARLY");
        assertFalse(session.isFinished());

        session.start();
        session.forfeit("SESSION_EXPIRED");
        session.forfeit("AGAIN");

        assertTrue(session.isFinished());
        assertFalse(session.isWon());
        assertEquals("SESSION_EXPIRED", session.getEndReason());
        assertEquals(1, listener.count("OVER"));
    }

    @Test
    void failingListenerDoesNotBreakTheSessionOrOtherListeners() {
        RecordingListener healthy = new RecordingListener();
        GameSession session = factory.create("session-faulty", GameMode.CLASSIC, Difficulty.EASY, "faulty", null);
        session.addListener(new RecordingListener() {
            @Override
            public void onCellUpdated(Position position, int value, boolean correct) {
                throw new IllegalStateException("boom");
            }
        });
        session.addListener(healthy);
        session.start();
        Position target = session.getBoard().getEmptyCells().get(0);

        assertEquals(MoveResult.CORRECT, session.submitValue(target, session.getBoard().getCell(target).getSolutionValue()));
        assertEquals(1, healthy.count("CELL"));
    }

    @Test
    void concurrentSubmissionsAndTicksKeepTheSessionConsistent() throws Exception {
        RecordingListener listener = new RecordingListener();
        GameSession session = session(GameMode.CLASSIC, Difficulty.MEDIUM, "threads", listener);
        session.start();
        List<Position> empty = session.getBoard().getEmptyCells();
        int workers = 4;
        ExecutorService pool = Executors.newFixedThreadPool(workers + 1);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (int w = 0; w < workers; w++) {
            int shard = w;
            futures.add(pool.submit(() -> {
                go.await();
                for (int i = shard; i < empty.size(); i += workers) {
                    TestSessions.solve(session, empty.get(i));
                }
                return null;
            }));
        }
        futures.add(pool.submit(() -> {
            go.await();
            for (int i = 0; i < 500; i++) {
                session.tick(GameSession.TICK_MS);
            }
            return null;
        }));
        go.countDown();
        for (Future<?> future : futures) {
            future.get(30, TimeUnit.SECONDS);
        }
        pool.shutdownNow();

        assertTrue(session.isFinished());
        assertTrue(session.isWon());
        assertEquals(1, listener.count("OVER"));
        assertEquals(empty.size(), listener.events.stream()
                .filter(e -> e.type().equals("CELL")).count());
        assertEquals(empty.size(), session.getReplayLog().size());
    }

    @Test
    void initStateCarriesGenerationMetricsAndReshapeUpdatesLatestMetrics() {
        RecordingListener listener = new RecordingListener();
        GameSession session = session(GameMode.BOT_CHALLENGE, Difficulty.HARD, "metrics", listener);
        session.start();

        AlgorithmMetrics initial = listener.initMetrics.get(0).orElseThrow();
        assertEquals(AlgorithmMetrics.PUZZLE_GEN, initial.operationType());
        assertEquals(initial, session.getLatestMetrics().orElseThrow());

        session.tick(300_000);

        assertEquals(1, listener.count("RESHAPED"));
        AlgorithmMetrics latest = session.getLatestMetrics().orElseThrow();
        assertEquals(AlgorithmMetrics.CAGE_RESHAPE, latest.operationType());
        assertEquals(listener.reshapeMetrics.get(0), latest);
    }
}
