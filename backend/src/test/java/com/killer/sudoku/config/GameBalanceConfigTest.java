package com.killer.sudoku.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import org.junit.jupiter.api.Test;

class GameBalanceConfigTest {

    @Test
    void easyPreset() {
        GameBalanceConfig c = GameBalanceConfig.forBotChallenge(Difficulty.EASY);
        assertEquals(100, c.maxHp());
        assertEquals(45_000, c.initialBotTimeoutMs());
        assertEquals(120_000, c.firstBotTimeoutMs());
        assertEquals(15, c.hpPenalty());
        assertEquals(0.10, c.timeoutDecay());
        assertFalse(c.hasReshape());
    }

    @Test
    void mediumPreset() {
        GameBalanceConfig c = GameBalanceConfig.forBotChallenge(Difficulty.MEDIUM);
        assertEquals(100, c.maxHp());
        assertEquals(50_000, c.initialBotTimeoutMs());
        assertEquals(120_000, c.firstBotTimeoutMs());
        assertEquals(25, c.hpPenalty());
        assertEquals(0.10, c.timeoutDecay());
        assertFalse(c.hasReshape());
    }

    @Test
    void hardPreset() {
        GameBalanceConfig c = GameBalanceConfig.forBotChallenge(Difficulty.HARD);
        assertEquals(100, c.maxHp());
        assertEquals(60_000, c.initialBotTimeoutMs());
        assertEquals(180_000, c.firstBotTimeoutMs());
        assertEquals(30, c.hpPenalty());
        assertEquals(0.10, c.timeoutDecay());
        assertTrue(c.hasReshape());
        assertEquals(300_000, c.reshapeIntervalMs());
        assertEquals(10_000, c.preReshapeAlertMs());
    }

    @Test
    void classicHasThreeLivesAndOneLifePerWrongAnswer() {
        assertEquals(3, GameBalanceConfig.startingHp(GameMode.CLASSIC, Difficulty.HARD));
        assertEquals(1, GameBalanceConfig.wrongAnswerPenalty(GameMode.CLASSIC, Difficulty.HARD));
    }

    @Test
    void rejectsInvalidValues() {
        assertThrows(IllegalArgumentException.class, () -> new GameBalanceConfig(0, 1000, 1, 0.1, 500, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> new GameBalanceConfig(100, 1000, 1, 1.0, 500, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> new GameBalanceConfig(100, 1000, 1, 0.1, 2000, 0, 0));
        assertThrows(IllegalArgumentException.class, () -> new GameBalanceConfig(100, 1000, 1, 0.1, 500, 5000, 5000));
    }
}
