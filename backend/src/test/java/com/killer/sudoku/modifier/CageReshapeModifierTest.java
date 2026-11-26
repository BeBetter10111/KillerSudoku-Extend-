package com.killer.sudoku.modifier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.config.GameBalanceConfig;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.SolverStrategyType;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Difficulty;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class CageReshapeModifierTest {

    private final GameBalanceConfig balance = GameBalanceConfig.forBotChallenge(Difficulty.HARD);

    private CageReshapeModifier newModifier(long seed) {
        return new CageReshapeModifier(balance, new BacktrackingCageGenerator(), new Random(seed));
    }

    private RecordingSession session() {
        return RecordingSession.withPuzzle(Difficulty.HARD, "reshape-mod", balance.maxHp());
    }

    @Test
    void startsAtFullInterval() {
        CageReshapeModifier modifier = newModifier(1);
        modifier.onInit(session());
        assertEquals(300_000, modifier.getTimeUntilReshapeMs());
        assertTrue(modifier.isActive());
    }

    @Test
    void emitsNothingBeforeAlertWindow() {
        RecordingSession session = session();
        CageReshapeModifier modifier = newModifier(1);
        modifier.onInit(session);
        modifier.onTick(session, 289_999);

        assertTrue(session.recorder.events.isEmpty());
        assertEquals(10_001, modifier.getTimeUntilReshapeMs());
    }

    @Test
    void emitsAlertExactlyOncePerCycleAtTenSecondsRemaining() {
        RecordingSession session = session();
        CageReshapeModifier modifier = newModifier(1);
        modifier.onInit(session);
        modifier.onTick(session, 290_000);
        modifier.onTick(session, 1_000);
        modifier.onTick(session, 1_000);

        assertEquals(List.of("ALERT"), session.types());
        assertEquals(10L, session.recorder.last("ALERT").data());
    }

    @Test
    void reshapesAtZeroReplacesCagesAndRestartsCycle() {
        RecordingSession session = session();
        List<Cage> before = session.getBoard().getCages();
        CageReshapeModifier modifier = newModifier(2);
        modifier.onInit(session);
        modifier.onTick(session, 290_000);
        modifier.onTick(session, 10_000);

        assertNotEquals(before, session.getBoard().getCages());
        assertEquals(300_000, modifier.getTimeUntilReshapeMs());
        assertEquals(List.of("ALERT", "RESHAPED"), session.types());
        @SuppressWarnings("unchecked")
        List<Cage> published = (List<Cage>) session.recorder.last("RESHAPED").data();
        assertIterableEquals(published, session.getBoard().getCages());
    }

    @Test
    void reshapePreservesCellValues() {
        RecordingSession session = session();
        session.solveAllExcept(30);
        int[][] before = values(session);
        CageReshapeModifier modifier = newModifier(3);
        modifier.onInit(session);
        modifier.onTick(session, 300_000);

        assertTrue(java.util.Arrays.deepEquals(before, values(session)));
        assertTrue(session.types().contains("RESHAPED"));
    }

    @Test
    void alertFiresAgainInNextCycle() {
        RecordingSession session = session();
        CageReshapeModifier modifier = newModifier(4);
        modifier.onInit(session);
        modifier.onTick(session, 300_000);
        modifier.onTick(session, 290_000);

        assertEquals(2, session.recorder.count("ALERT"));
    }

    @Test
    void oversizedTickAlertsThenReshapesOnce() {
        RecordingSession session = session();
        CageReshapeModifier modifier = newModifier(5);
        modifier.onInit(session);
        modifier.onTick(session, 900_000);

        assertEquals(List.of("ALERT", "RESHAPED"), session.types());
        assertEquals(0L, session.recorder.last("ALERT").data());
        assertEquals(300_000, modifier.getTimeUntilReshapeMs());
    }

    @Test
    void rejectsConfigWithoutReshapeInterval() {
        GameBalanceConfig easy = GameBalanceConfig.forBotChallenge(Difficulty.EASY);
        assertThrows(IllegalArgumentException.class,
                () -> new CageReshapeModifier(easy, new BacktrackingCageGenerator(), new Random(1)));
        assertFalse(easy.hasReshape());
    }

    private static int[][] values(RecordingSession session) {
        int[][] grid = new int[9][9];
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                grid[r][c] = session.getBoard().getCell(r, c).getCurrentValue();
            }
        }
        return grid;
    }

    @Test
    void forwardsAlgorithmMetricsToSessionAndKeepsLastCopy() {
        RecordingSession session = session();
        CageReshapeModifier modifier = newModifier(2);
        modifier.onInit(session);
        assertTrue(modifier.getLastMetrics().isEmpty());
        modifier.onTick(session, 300_000);

        assertEquals(1, session.recorder.reshapeMetrics.size());
        AlgorithmMetrics forwarded = session.recorder.reshapeMetrics.get(0);
        assertEquals(forwarded, modifier.getLastMetrics().orElseThrow());
        assertEquals(AlgorithmMetrics.CAGE_RESHAPE, forwarded.operationType());
        assertEquals(SolverStrategyType.OPTIMIZED_MRV_PRUNING, forwarded.strategyUsed());
        assertTrue(forwarded.oracleVerified());
        assertTrue(forwarded.unionFindOps() > 0);
    }

    @Test
    void usesTheConfiguredSolverStrategy() {
        RecordingSession session = session();
        CageReshapeModifier modifier = new CageReshapeModifier(
                balance, new BacktrackingCageGenerator(), SolverStrategyType.NAIVE_ORACLE, new Random(6));
        modifier.onInit(session);
        modifier.onTick(session, 300_000);

        AlgorithmMetrics metrics = modifier.getLastMetrics().orElseThrow();
        assertEquals(SolverStrategyType.NAIVE_ORACLE, metrics.strategyUsed());
        assertEquals(0, metrics.prunedBranches());
        assertTrue(session.types().contains("RESHAPED"));
    }
}
