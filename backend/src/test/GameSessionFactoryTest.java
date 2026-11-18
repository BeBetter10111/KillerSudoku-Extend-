package com.killer.sudoku.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import static org.junit.jupiter.api.Assertions.assertTrue;
import com.killer.sudoku.model.SolverStrategyType;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.support.TestSessions;
import org.junit.jupiter.api.Test;

class GameSessionFactoryTest {

    private final GameSessionFactory factory = TestSessions.factory();

    @Test
    void sameSeedReproducesBoardAndBotPlacement() {
        GameSession a = factory.create("a", GameMode.BOT_CHALLENGE, Difficulty.HARD, "daily-2026-11-15", "x");
        GameSession b = factory.create("b", GameMode.BOT_CHALLENGE, Difficulty.HARD, "daily-2026-11-15", "y");
        a.start();
        b.start();

        assertEquals(a.getBoard().getCages(), b.getBoard().getCages());
        assertEquals(a.getBot().orElseThrow().getPosition(), b.getBot().orElseThrow().getPosition());
        assertEquals(a.getBoard().getEmptyCells(), b.getBoard().getEmptyCells());
    }

    @Test
    void differentSeedsGiveDifferentPuzzles() {
        GameSession a = factory.create("a", GameMode.CLASSIC, Difficulty.MEDIUM, "seed-one", null);
        GameSession b = factory.create("b", GameMode.CLASSIC, Difficulty.MEDIUM, "seed-two", null);
        assertNotEquals(a.getBoard().getCages(), b.getBoard().getCages());
    }

    @Test
    void exposesCreationParameters() {
        GameSession session = factory.create("sid", GameMode.CLASSIC, Difficulty.EASY, "s", "Frog");
        assertEquals("sid", session.getSessionId());
        assertEquals(GameMode.CLASSIC, session.getGameMode());
        assertEquals(Difficulty.EASY, session.getDifficulty());
        assertEquals("s", session.getSeed());
        assertEquals("Frog", session.getPlayerName());
        assertEquals(100, session.getPlayerHealth().getMaxHp());
    }

    @Test
    void recordsSolverStrategyAndPuzzleGenerationMetrics() {
        for (SolverStrategyType strategy : SolverStrategyType.values()) {
            GameSession session =
                    factory.create("sid-" + strategy, GameMode.CLASSIC, Difficulty.MEDIUM, strategy, "metrics-seed", null);
            AlgorithmMetrics metrics = session.getLatestMetrics().orElseThrow();
            assertEquals(strategy, session.getSolverStrategy());
            assertEquals(strategy, metrics.strategyUsed());
            assertEquals(AlgorithmMetrics.PUZZLE_GEN, metrics.operationType());
            assertTrue(metrics.oracleVerified());
            assertTrue(metrics.unionFindOps() > 0);
        }
    }

    @Test
    void sameSeedAndStrategyIsDeterministicAndLegacyCreateUsesOptimized() {
        GameSession a = factory.create("a", GameMode.CLASSIC, Difficulty.HARD, SolverStrategyType.NAIVE_ORACLE, "det", null);
        GameSession b = factory.create("b", GameMode.CLASSIC, Difficulty.HARD, SolverStrategyType.NAIVE_ORACLE, "det", null);
        assertEquals(a.getBoard().getCages(), b.getBoard().getCages());
        assertEquals(a.getBoard().getEmptyCells(), b.getBoard().getEmptyCells());

        GameSession legacy = factory.create("c", GameMode.CLASSIC, Difficulty.HARD, "det", null);
        GameSession explicit =
                factory.create("d", GameMode.CLASSIC, Difficulty.HARD, SolverStrategyType.OPTIMIZED_MRV_PRUNING, "det", null);
        assertEquals(SolverStrategyType.OPTIMIZED_MRV_PRUNING, legacy.getSolverStrategy());
        assertEquals(explicit.getBoard().getCages(), legacy.getBoard().getCages());
    }
}
