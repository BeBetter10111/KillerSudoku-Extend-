package com.killer.sudoku.service;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.SolverStrategyType;

public record BenchmarkResult(
        Difficulty difficulty,
        int batchSize,
        int comparedCount,
        int inconclusiveCount,
        String seedPrefix,
        StrategyStats naive,
        StrategyStats optimized,
        double nodeReductionPercent,
        double oracleAgreementPercent,
        long generatedAt) {

    public record StrategyStats(
            SolverStrategyType strategy,
            double p50LatencyMs,
            double p95LatencyMs,
            double avgNodesVisited,
            double avgPrunedBranches,
            long peakMemoryBytes) {
    }
}
