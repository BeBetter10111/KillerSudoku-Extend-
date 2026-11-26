package com.killer.sudoku.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class AlgorithmMetricsTest {

    @Test
    void emptyMetricsStartAtZeroAndUnverified() {
        AlgorithmMetrics m = AlgorithmMetrics.empty(SolverStrategyType.NAIVE_ORACLE, AlgorithmMetrics.SOLVE);
        assertEquals(SolverStrategyType.NAIVE_ORACLE, m.strategyUsed());
        assertEquals("SOLVE", m.operationType());
        assertEquals(0, m.nodesVisited() + m.prunedBranches() + m.unionFindOps() + m.memoryBytes());
        assertEquals(0.0, m.executionTimeMs());
        assertFalse(m.oracleVerified());
    }

    @Test
    void plusSumsCountersAndKeepsLeftIdentity() {
        AlgorithmMetrics a = new AlgorithmMetrics(SolverStrategyType.OPTIMIZED_MRV_PRUNING,
                AlgorithmMetrics.CAGE_RESHAPE, 1.5, 10, 4, 7, 100, false);
        AlgorithmMetrics b = new AlgorithmMetrics(SolverStrategyType.NAIVE_ORACLE,
                AlgorithmMetrics.SOLVE, 2.0, 5, 1, 3, 50, true);
        AlgorithmMetrics sum = a.plus(b);
        assertEquals(SolverStrategyType.OPTIMIZED_MRV_PRUNING, sum.strategyUsed());
        assertEquals("CAGE_RESHAPE", sum.operationType());
        assertEquals(3.5, sum.executionTimeMs());
        assertEquals(15, sum.nodesVisited());
        assertEquals(5, sum.prunedBranches());
        assertEquals(10, sum.unionFindOps());
        assertEquals(150, sum.memoryBytes());
        assertFalse(sum.oracleVerified());
    }

    @Test
    void withersReplaceOnlyTheirOwnFields() {
        AlgorithmMetrics m = AlgorithmMetrics.empty(SolverStrategyType.OPTIMIZED_MRV_PRUNING, AlgorithmMetrics.PUZZLE_GEN)
                .withTiming(4.25, 2048).withUnionFindOps(9).withOracleVerified(true);
        assertEquals(4.25, m.executionTimeMs());
        assertEquals(2048, m.memoryBytes());
        assertEquals(9, m.unionFindOps());
        assertTrue(m.oracleVerified());
        assertEquals(0, m.nodesVisited());
    }
}
