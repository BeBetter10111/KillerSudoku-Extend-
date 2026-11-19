package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.SolverStrategyType;

public final class SolverFactory {

    static final long ORACLE_NODE_BUDGET = 1_000_000;

    private static final SudokuSolver NAIVE = new NaiveBacktrackingSolver();
    private static final SudokuSolver OPTIMIZED = new OptimizedBacktrackingSolver();
    private static final SudokuSolver BOUNDED_ORACLE = new NaiveBacktrackingSolver(ORACLE_NODE_BUDGET);

    private SolverFactory() {
    }

    public static SudokuSolver forStrategy(SolverStrategyType type) {
        return switch (type) {
            case NAIVE_ORACLE -> NAIVE;
            case OPTIMIZED_MRV_PRUNING -> OPTIMIZED;
        };
    }

    public static SudokuSolver boundedOracle() {
        return BOUNDED_ORACLE;
    }
}
