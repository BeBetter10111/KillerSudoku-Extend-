package com.killer.sudoku.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.PuzzleGenerator;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.SolverStrategyType;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class BenchmarkServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-16T00:00:00Z"), ZoneOffset.UTC);

    private final BenchmarkService service =
            new BenchmarkService(new PuzzleGenerator(new BacktrackingCageGenerator()), CLOCK);

    @Test
    void comparesBothSolversOnIdenticalPuzzlesWithFullAgreement() {
        BenchmarkResult result = service.run(Difficulty.MEDIUM, 12, "unit");

        assertEquals(Difficulty.MEDIUM, result.difficulty());
        assertEquals(12, result.batchSize());
        assertEquals(12, result.comparedCount() + result.inconclusiveCount());
        assertEquals(0, result.inconclusiveCount());
        assertEquals(100.0, result.oracleAgreementPercent());
        assertEquals("unit", result.seedPrefix());
        assertEquals(CLOCK.millis(), result.generatedAt());

        BenchmarkResult.StrategyStats naive = result.naive();
        BenchmarkResult.StrategyStats optimized = result.optimized();
        assertEquals(SolverStrategyType.NAIVE_ORACLE, naive.strategy());
        assertEquals(SolverStrategyType.OPTIMIZED_MRV_PRUNING, optimized.strategy());
        assertTrue(naive.p50LatencyMs() > 0 && naive.p50LatencyMs() <= naive.p95LatencyMs());
        assertTrue(optimized.p50LatencyMs() > 0 && optimized.p50LatencyMs() <= optimized.p95LatencyMs());
        assertEquals(0.0, naive.avgPrunedBranches());
        assertTrue(optimized.avgPrunedBranches() > 0);
        assertTrue(optimized.avgNodesVisited() < naive.avgNodesVisited());
        assertTrue(result.nodeReductionPercent() > 0 && result.nodeReductionPercent() < 100);
        assertTrue(naive.peakMemoryBytes() >= 0 && optimized.peakMemoryBytes() >= 0);
    }

    @Test
    void nodeCountersAreDeterministicForTheSamePrefix() {
        BenchmarkResult a = service.run(Difficulty.HARD, 8, "same");
        BenchmarkResult b = service.run(Difficulty.HARD, 8, "same");
        assertEquals(a.naive().avgNodesVisited(), b.naive().avgNodesVisited());
        assertEquals(a.optimized().avgNodesVisited(), b.optimized().avgNodesVisited());
        assertEquals(a.optimized().avgPrunedBranches(), b.optimized().avgPrunedBranches());
        assertEquals(a.nodeReductionPercent(), b.nodeReductionPercent());
    }

    @Test
    void usesDefaultPrefixWhenBlank() {
        assertEquals(BenchmarkService.DEFAULT_SEED_PREFIX, service.run(Difficulty.EASY, 2, "  ").seedPrefix());
    }

    @Test
    void rejectsInvalidArguments() {
        assertThrows(IllegalArgumentException.class, () -> service.run(null, 10, null));
        assertThrows(IllegalArgumentException.class, () -> service.run(Difficulty.EASY, 0, null));
        assertThrows(IllegalArgumentException.class,
                () -> service.run(Difficulty.EASY, BenchmarkService.MAX_BATCH_SIZE + 1, null));
        assertThrows(IllegalArgumentException.class, () -> service.run(Difficulty.EASY, 5, "x".repeat(33)));
        assertThrows(IllegalArgumentException.class, () -> service.run(Difficulty.EASY, 5, "bad\nprefix"));
    }

    @Test
    void refusesToRunTwoBenchmarksAtOnce() throws InterruptedException {
        service.gate.acquire();
        try {
            assertThrows(BenchmarkBusyException.class, () -> service.run(Difficulty.EASY, 1, null));
        } finally {
            service.gate.release();
        }
        assertEquals(1, service.run(Difficulty.EASY, 1, null).batchSize());
    }

    @Test
    void percentileUsesNearestRank() {
        List<Double> sorted = List.of(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0);
        assertEquals(5.0, BenchmarkService.percentile(sorted, 0.50));
        assertEquals(10.0, BenchmarkService.percentile(sorted, 0.95));
        assertEquals(1.0, BenchmarkService.percentile(sorted, 0.0));
        assertEquals(0.0, BenchmarkService.percentile(List.of(), 0.5));
        assertEquals(7.0, BenchmarkService.percentile(List.of(7.0), 0.95));
    }
}
