package com.killer.sudoku.server.handler;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.killer.sudoku.model.SolverStrategyType;
import org.junit.jupiter.api.Test;

class SingleGameControllerTest {

    @Test
    void defaultsToOptimizedWhenNothingIsRequested() {
        assertEquals(SolverStrategyType.OPTIMIZED_MRV_PRUNING, SingleGameController.resolveStrategy(null, false));
    }

    @Test
    void honoursTheRequestedStrategyForFreePlay() {
        assertEquals(SolverStrategyType.NAIVE_ORACLE,
                SingleGameController.resolveStrategy(SolverStrategyType.NAIVE_ORACLE, false));
        assertEquals(SolverStrategyType.OPTIMIZED_MRV_PRUNING,
                SingleGameController.resolveStrategy(SolverStrategyType.OPTIMIZED_MRV_PRUNING, false));
    }

    @Test
    void forcesTheCanonicalStrategyForDailySeeds() {
        assertEquals(SolverStrategyType.OPTIMIZED_MRV_PRUNING,
                SingleGameController.resolveStrategy(SolverStrategyType.NAIVE_ORACLE, true));
    }
}
