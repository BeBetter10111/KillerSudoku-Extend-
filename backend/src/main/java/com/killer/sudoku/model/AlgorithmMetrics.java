package com.killer.sudoku.model;

public record AlgorithmMetrics(
        SolverStrategyType strategyUsed,
        String operationType,
        double executionTimeMs,
        long nodesVisited,
        long prunedBranches,
        long unionFindOps,
        long memoryBytes,
        boolean oracleVerified) {

    public static final String PUZZLE_GEN = "PUZZLE_GEN";
    public static final String CAGE_RESHAPE = "CAGE_RESHAPE";
    public static final String SOLVE = "SOLVE";

    public static AlgorithmMetrics empty(SolverStrategyType strategy, String operationType) {
        return new AlgorithmMetrics(strategy, operationType, 0, 0, 0, 0, 0, false);
    }

    public AlgorithmMetrics plus(AlgorithmMetrics other) {
        return new AlgorithmMetrics(
                strategyUsed,
                operationType,
                executionTimeMs + other.executionTimeMs,
                nodesVisited + other.nodesVisited,
                prunedBranches + other.prunedBranches,
                unionFindOps + other.unionFindOps,
                memoryBytes + other.memoryBytes,
                oracleVerified);
    }

    public AlgorithmMetrics withTiming(double executionTimeMs, long memoryBytes) {
        return new AlgorithmMetrics(strategyUsed, operationType, executionTimeMs, nodesVisited, prunedBranches,
                unionFindOps, memoryBytes, oracleVerified);
    }

    public AlgorithmMetrics withUnionFindOps(long unionFindOps) {
        return new AlgorithmMetrics(strategyUsed, operationType, executionTimeMs, nodesVisited, prunedBranches,
                unionFindOps, memoryBytes, oracleVerified);
    }

    public AlgorithmMetrics withOracleVerified(boolean oracleVerified) {
        return new AlgorithmMetrics(strategyUsed, operationType, executionTimeMs, nodesVisited, prunedBranches,
                unionFindOps, memoryBytes, oracleVerified);
    }
}
