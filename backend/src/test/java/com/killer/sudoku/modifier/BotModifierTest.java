package com.killer.sudoku.modifier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.algorithm.WeightedRandomBotStrategy;
import com.killer.sudoku.config.GameBalanceConfig;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.Position;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class BotModifierTest {

    private final GameBalanceConfig balance = GameBalanceConfig.forBotChallenge(Difficulty.MEDIUM);

    private BotModifier newModifier(long seed) {
        return new BotModifier(balance, new WeightedRandomBotStrategy(), new Random(seed));
    }

    private RecordingSession session() {
        return RecordingSession.withPuzzle(Difficulty.MEDIUM, "bot-test", balance.maxHp());
    }

    @Test
    void onInitSpawnsHiddenBotOnEmptyCellWithoutLeakingPosition() {
        RecordingSession session = session();
        BotModifier modifier = newModifier(1);
        modifier.onInit(session);

        BotEntity bot = modifier.getBot().orElseThrow();
        assertFalse(bot.isRevealed());
        assertTrue(session.getBoard().getCell(bot.getPosition()).isEmpty());
        assertEquals(List.of("BOT"), session.types());
        assertFalse(session.lastBot().revealed());
        assertEquals(bot.getPosition(), session.lastBot().position());
        assertTrue(modifier.isActive());
    }

    @Test
    void onInitStaysInactiveWhenFewerThanTwoEmptyCells() {
        RecordingSession session = session();
        session.solveAllExcept(1);
        BotModifier modifier = newModifier(1);
        modifier.onInit(session);

        assertFalse(modifier.isActive());
        assertTrue(modifier.getBot().isEmpty());
        assertTrue(session.recorder.events.isEmpty());
    }

    @Test
    void correctAnswerElsewhereDoesNothing() {
        RecordingSession session = session();
        BotModifier modifier = newModifier(2);
        modifier.onInit(session);
        Position botPosition = modifier.getBot().orElseThrow().getPosition();
        Position other = session.getBoard().getEmptyCells().stream()
                .filter(p -> !p.equals(botPosition)).findFirst().orElseThrow();
        session.solve(other);
        modifier.onCorrectAnswer(session, other);

        assertEquals(botPosition, modifier.getBot().orElseThrow().getPosition());
        assertFalse(modifier.getBot().orElseThrow().isRevealed());
        assertEquals(1, session.recorder.events.size());
    }

    @Test
    void solvingBotCellRevealsAndJumpsToNewEmptyCellWithInitialTimeout() {
        RecordingSession session = session();
        BotModifier modifier = newModifier(3);
        modifier.onInit(session);
        Position found = modifier.getBot().orElseThrow().getPosition();
        session.solve(found);
        modifier.onCorrectAnswer(session, found);

        BotEntity bot = modifier.getBot().orElseThrow();
        assertTrue(bot.isRevealed());
        assertNotEquals(found, bot.getPosition());
        assertTrue(session.getBoard().getCell(bot.getPosition()).isEmpty());
        assertEquals(balance.initialBotTimeoutMs(), bot.getMaxTimeoutMs());
        assertEquals(balance.initialBotTimeoutMs(), bot.getRemainingTimeoutMs());
        assertEquals(List.of("BOT", "BOT"), session.types());
        assertTrue(session.lastBot().revealed());
        assertEquals(bot.getPosition(), session.lastBot().position());
    }

    @Test
    void consecutiveRevealsShrinkTimeoutByTenPercentEach() {
        RecordingSession session = session();
        BotModifier modifier = newModifier(4);
        modifier.onInit(session);
        long expected = balance.initialBotTimeoutMs();
        for (int i = 0; i < 4; i++) {
            Position at = modifier.getBot().orElseThrow().getPosition();
            session.solve(at);
            modifier.onCorrectAnswer(session, at);
            assertEquals(expected, modifier.getBot().orElseThrow().getMaxTimeoutMs());
            expected = Math.round(expected * 0.9);
        }
    }

    @Test
    void timeoutNeverDropsBelowConfiguredFloor() {
        RecordingSession session = RecordingSession.withPuzzle(Difficulty.HARD, "floor", 100);
        BotModifier modifier = new BotModifier(balance, new WeightedRandomBotStrategy(), new Random(5));
        modifier.onInit(session);
        for (int i = 0; i < 40 && modifier.isActive(); i++) {
            Position at = modifier.getBot().orElseThrow().getPosition();
            session.solve(at);
            modifier.onCorrectAnswer(session, at);
            if (modifier.isActive()) {
                assertTrue(modifier.getBot().orElseThrow().getMaxTimeoutMs() >= balance.minBotTimeoutMs());
            }
        }
        assertEquals(balance.minBotTimeoutMs(), modifier.getBot().orElseThrow().getMaxTimeoutMs());
    }

    @Test
    void tickDoesNotCountDownWhileBotIsHidden() {
        RecordingSession session = session();
        BotModifier modifier = newModifier(6);
        modifier.onInit(session);
        modifier.onTick(session, 999_999);

        assertEquals(100, session.getPlayerHealth().getCurrentHp());
        assertEquals(1, session.recorder.events.size());
    }

    @Test
    void tickDecrementsRevealedBotTimeout() {
        RecordingSession session = session();
        BotModifier modifier = newModifier(7);
        modifier.onInit(session);
        Position at = modifier.getBot().orElseThrow().getPosition();
        session.solve(at);
        modifier.onCorrectAnswer(session, at);
        modifier.onTick(session, 1_000);

        assertEquals(balance.initialBotTimeoutMs() - 1_000, modifier.getBot().orElseThrow().getRemainingTimeoutMs());
        assertEquals(100, session.getPlayerHealth().getCurrentHp());
    }

    @Test
    void expiredTimeoutDeductsHpAndRespawnsHiddenAtNewCell() {
        RecordingSession session = session();
        BotModifier modifier = newModifier(8);
        modifier.onInit(session);
        Position at = modifier.getBot().orElseThrow().getPosition();
        session.solve(at);
        modifier.onCorrectAnswer(session, at);
        Position timedOutAt = modifier.getBot().orElseThrow().getPosition();
        modifier.onTick(session, balance.initialBotTimeoutMs());

        BotEntity bot = modifier.getBot().orElseThrow();
        assertEquals(100 - balance.hpPenalty(), session.getPlayerHealth().getCurrentHp());
        assertFalse(bot.isRevealed());
        assertNotEquals(timedOutAt, bot.getPosition());
        assertTrue(session.getBoard().getCell(bot.getPosition()).isEmpty());
        assertEquals(balance.initialBotTimeoutMs(), bot.getMaxTimeoutMs());
        assertEquals(100 - balance.hpPenalty(), session.recorder.last("HP").data());
        assertEquals(List.of("BOT", "BOT", "HP", "BOT"), session.types());
        assertFalse(session.lastBot().revealed());
        assertTrue(session.lastBot().active());
        assertTrue(modifier.isActive());
    }

    @Test
    void timeoutResetsConsecutiveRevealChain() {
        RecordingSession session = session();
        BotModifier modifier = newModifier(9);
        modifier.onInit(session);
        for (int i = 0; i < 3; i++) {
            Position at = modifier.getBot().orElseThrow().getPosition();
            session.solve(at);
            modifier.onCorrectAnswer(session, at);
        }
        modifier.onTick(session, 1_000_000);
        Position at = modifier.getBot().orElseThrow().getPosition();
        session.solve(at);
        modifier.onCorrectAnswer(session, at);

        assertEquals(balance.initialBotTimeoutMs(), modifier.getBot().orElseThrow().getMaxTimeoutMs());
    }

    @Test
    void lethalTimeoutDeactivatesModifier() {
        RecordingSession session = RecordingSession.withPuzzle(Difficulty.MEDIUM, "dead", balance.hpPenalty());
        BotModifier modifier = newModifier(10);
        modifier.onInit(session);
        Position at = modifier.getBot().orElseThrow().getPosition();
        session.solve(at);
        modifier.onCorrectAnswer(session, at);
        modifier.onTick(session, 1_000_000);

        assertTrue(session.getPlayerHealth().isDead());
        assertFalse(modifier.isActive());
        assertEquals("BOT", session.recorder.lastEvent().type());
        assertFalse(session.lastBot().active());
    }

    @Test
    void endGameGuardDeactivatesWhenFewerThanTwoEmptyCellsRemain() {
        RecordingSession session = session();
        BotModifier modifier = newModifier(11);
        modifier.onInit(session);
        session.solveAllExcept(1);
        Position last = session.getBoard().getEmptyCells().get(0);
        modifier.onCorrectAnswer(session, last);

        assertFalse(modifier.isActive());
        assertFalse(modifier.getBot().orElseThrow().isActive());
        assertFalse(session.lastBot().active());
        modifier.onTick(session, 1_000_000);
        assertEquals(100, session.getPlayerHealth().getCurrentHp());
    }

    @Test
    void sameSeedReplaysSameBotPath() {
        RecordingSession first = session();
        RecordingSession second = session();
        BotModifier a = newModifier(12);
        BotModifier b = newModifier(12);
        a.onInit(first);
        b.onInit(second);
        for (int i = 0; i < 5; i++) {
            Position pa = a.getBot().orElseThrow().getPosition();
            Position pb = b.getBot().orElseThrow().getPosition();
            assertEquals(pa, pb);
            first.solve(pa);
            second.solve(pb);
            a.onCorrectAnswer(first, pa);
            b.onCorrectAnswer(second, pb);
        }
    }
}
