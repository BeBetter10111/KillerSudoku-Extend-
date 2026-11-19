package com.killer.sudoku.server.validator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.SolverStrategyType;
import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.core.MoveRecord;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.service.TimerService;
import com.killer.sudoku.support.RecordingListener;
import com.killer.sudoku.support.TestSessions;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class ServerReplayValidatorTest {

    private static final String SEED = "daily-2026-11-15";

    private final ServerReplayValidator validator = new ServerReplayValidator(TestSessions.factory());

    private GameSession playedGame(GameMode mode, Difficulty difficulty, int idleTicks, RecordingListener listener) {
        GameSession session = TestSessions.factory().create("played", mode, difficulty, SEED, "Frog");
        session.addListener(listener);
        session.start();
        TestSessions.playToCompletion(session, idleTicks, 12, 7, 9);
        assertTrue(session.isFinished());
        return session;
    }

    @Test
    void acceptsHonestBotChallengeGameWithMistakes() {
        GameSession session = playedGame(GameMode.BOT_CHALLENGE, Difficulty.MEDIUM, 0, new RecordingListener());
        assertTrue(session.isWon());
        assertTrue(session.getPenaltyMs() > 0);

        ServerReplayValidator.Result result = validator.validate(session);

        assertTrue(result.valid(), result.reason());
        assertEquals(session.getFinalTimeMs(), result.verifiedTimeMs());
    }

    @Test
    void acceptsHonestHardGameThatSpansCageReshapes() {
        RecordingListener listener = new RecordingListener();
        GameSession session = playedGame(GameMode.BOT_CHALLENGE, Difficulty.HARD, 1_300, listener);
        assertTrue(session.isWon());
        assertTrue(listener.count("ALERT") >= 1);
        assertTrue(listener.count("RESHAPED") >= 1);

        ServerReplayValidator.Result result = validator.validate(session);

        assertTrue(result.valid(), result.reason());
    }

    @Test
    void acceptsHonestClassicGame() {
        GameSession session = playedGame(GameMode.CLASSIC, Difficulty.EASY, 40, new RecordingListener());
        assertTrue(validator.validate(session).valid());
    }

    @Test
    void rejectsShortenedFinalTime() {
        GameSession honest = playedGame(GameMode.CLASSIC, Difficulty.MEDIUM, 40, new RecordingListener());
        GameSession forged = new Forged(honest, honest.getReplayLog(), honest.getFinalTimeMs() - 1_000, honest.getSeed());
        assertFalse(validator.validate(forged).valid());
    }

    @Test
    void rejectsLogWhereAWrongMoveIsClaimedCorrect() {
        GameSession honest = playedGame(GameMode.CLASSIC, Difficulty.MEDIUM, 40, new RecordingListener());
        List<MoveRecord> log = new ArrayList<>(honest.getReplayLog());
        int wrongIndex = -1;
        for (int i = 0; i < log.size(); i++) {
            if (!log.get(i).correct()) {
                wrongIndex = i;
                break;
            }
        }
        assertTrue(wrongIndex >= 0);
        MoveRecord wrong = log.get(wrongIndex);
        log.set(wrongIndex, new MoveRecord(wrong.position(), wrong.value(), wrong.elapsedMs(), true));

        assertFalse(validator.validate(new Forged(honest, log, honest.getFinalTimeMs(), honest.getSeed())).valid());
    }

    @Test
    void rejectsLogWithEditedTimestamps() {
        GameSession honest = playedGame(GameMode.CLASSIC, Difficulty.MEDIUM, 40, new RecordingListener());
        List<MoveRecord> log = new ArrayList<>(honest.getReplayLog());
        MoveRecord last = log.get(log.size() - 1);
        log.set(log.size() - 1, new MoveRecord(last.position(), last.value(), last.elapsedMs() - 250, last.correct()));
        assertFalse(validator.validate(new Forged(honest, log, honest.getFinalTimeMs(), honest.getSeed())).valid());

        List<MoveRecord> offGrid = new ArrayList<>(honest.getReplayLog());
        MoveRecord first = offGrid.get(0);
        offGrid.set(0, new MoveRecord(first.position(), first.value(), first.elapsedMs() + 100, first.correct()));
        assertFalse(validator.validate(new Forged(honest, offGrid, honest.getFinalTimeMs(), honest.getSeed())).valid());
    }

    @Test
    void rejectsLogReplayedAgainstDifferentSeed() {
        GameSession honest = playedGame(GameMode.CLASSIC, Difficulty.MEDIUM, 40, new RecordingListener());
        assertFalse(validator.validate(new Forged(honest, honest.getReplayLog(), honest.getFinalTimeMs(), "other-seed")).valid());
    }

    @Test
    void rejectsSessionsThatWereNotWon() {
        GameSession session = TestSessions.factory().create("lost", GameMode.CLASSIC, Difficulty.EASY, SEED, "Frog");
        session.start();
        session.forfeit("SESSION_EXPIRED");
        assertFalse(validator.validate(session).valid());
        assertFalse(validator.validate(TestSessions.factory().create("new", GameMode.CLASSIC, Difficulty.EASY, SEED, null)).valid());
    }

    private static final class Forged extends GameSession {

        private final List<MoveRecord> log;
        private final long finalTimeMs;

        Forged(GameSession base, List<MoveRecord> log, long finalTimeMs, String seed) {
            super("forged", base.getGameMode(), base.getDifficulty(), seed, "cheater",
                    base.getBoard(), base.getPlayerHealth(), new TimerService(), List.of());
            this.log = log;
            this.finalTimeMs = finalTimeMs;
        }

        @Override
        public synchronized boolean isFinished() {
            return true;
        }

        @Override
        public synchronized boolean isWon() {
            return true;
        }

        @Override
        public synchronized List<MoveRecord> getReplayLog() {
            return log;
        }

        @Override
        public synchronized long getFinalTimeMs() {
            return finalTimeMs;
        }
    }

    @Test
    void replaysOnTheSameSolverStrategyAsTheOriginalSession() {
        for (SolverStrategyType strategy : SolverStrategyType.values()) {
            GameSession session = TestSessions.factory()
                    .create("played-" + strategy, GameMode.BOT_CHALLENGE, Difficulty.MEDIUM, strategy, SEED, "Frog");
            session.start();
            TestSessions.playToCompletion(session, 0, 12, 7, 9);
            assertTrue(session.isWon());

            ServerReplayValidator.Result result = validator.validate(session);

            assertTrue(result.valid(), strategy + ": " + result.reason());
            assertEquals(session.getFinalTimeMs(), result.verifiedTimeMs());
        }
    }
}
