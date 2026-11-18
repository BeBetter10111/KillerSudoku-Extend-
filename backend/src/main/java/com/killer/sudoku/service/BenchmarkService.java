package com.killer.sudoku.service;

import com.killer.sudoku.algorithm.NaiveBacktrackingSolver;
import com.killer.sudoku.algorithm.PuzzleGenerator;
import com.killer.sudoku.algorithm.SolverFactory;
import com.killer.sudoku.algorithm.SudokuSolver;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.SolverStrategyType;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.function.ToDoubleFunction;

public class BenchmarkService {

    public static final int DEFAULT_BATCH_SIZE = 100;
    public static final int MAX_BATCH_SIZE = 1000;
    public static final String DEFAULT_SEED_PREFIX = "benchmark";
    public static final int MAX_SEED_PREFIX_LENGTH = 32;

    static final int WARMUP_RUNS = 10;
    static final long NAIVE_NODE_BUDGET = 20_000_000;

    private static final int SIZE = Board.SIZE;

    private final PuzzleGenerator puzzleGenerator;
    private final Clock clock;
    final Semaphore gate = new Semaphore(1);

    public BenchmarkService(PuzzleGenerator puzzleGenerator, Clock clock) {
        this.puzzleGenerator = puzzleGenerator;
        this.clock = clock;
    }

    public BenchmarkResult run(Difficulty difficulty, int batchSize, String seedPrefix) {
        if (difficulty == null) {
            throw new IllegalArgumentException("difficulty is required");
        }
        if (batchSize < 1 || batchSize > MAX_BATCH_SIZE) {
            throw new IllegalArgumentException("batchSize must be between 1 and " + MAX_BATCH_SIZE);
        }
        String prefix = resolvePrefix(seedPrefix);
        if (!gate.tryAcquire()) {
            throw new BenchmarkBusyException();
        }
        try {
            return execute(difficulty, batchSize, prefix);
        } finally {
            gate.release();
        }
    }

    private BenchmarkResult execute(Difficulty difficulty, int batchSize, String prefix) {
        SudokuSolver naive = new NaiveBacktrackingSolver(NAIVE_NODE_BUDGET);
        SudokuSolver optimized = SolverFactory.forStrategy(SolverStrategyType.OPTIMIZED_MRV_PRUNING);
        warmUp(difficulty, prefix, naive, optimized);

        List<AlgorithmMetrics> naiveRuns = new ArrayList<>(batchSize);
        List<AlgorithmMetrics> optimizedRuns = new ArrayList<>(batchSize);
        int agreed = 0;
        int inconclusive = 0;
        for (int i = 0; i < batchSize; i++) {
            Board board = puzzleGenerator.generate(difficulty, prefix + "-" + i);
            int[][] givens = new int[SIZE][SIZE];
            int[][] truth = new int[SIZE][SIZE];
            for (int row = 0; row < SIZE; row++) {
                for (int col = 0; col < SIZE; col++) {
                    Cell cell = board.getCell(row, col);
                    truth[row][col] = cell.getSolutionValue();
                    givens[row][col] = cell.isGiven() ? cell.getSolutionValue() : Cell.EMPTY;
                }
            }
            SudokuSolver.SolveResult fast = optimized.solve(givens, board.getCages());
            SudokuSolver.SolveResult oracle = naive.solve(givens, board.getCages());
            if (!oracle.solved()) {
                inconclusive++;
                continue;
            }
            optimizedRuns.add(fast.metrics());
            naiveRuns.add(oracle.metrics());
            if (fast.solved() && Arrays.deepEquals(fast.solution(), truth)
                    && Arrays.deepEquals(oracle.solution(), truth)) {
                agreed++;
            }
        }
        int compared = optimizedRuns.size();
        BenchmarkResult.StrategyStats naiveStats = stats(SolverStrategyType.NAIVE_ORACLE, naiveRuns);
        BenchmarkResult.StrategyStats optimizedStats = stats(SolverStrategyType.OPTIMIZED_MRV_PRUNING, optimizedRuns);
        double naiveNodes = total(naiveRuns, AlgorithmMetrics::nodesVisited);
        double optimizedNodes = total(optimizedRuns, AlgorithmMetrics::nodesVisited);
        double reduction = naiveNodes == 0 ? 0 : (1.0 - optimizedNodes / naiveNodes) * 100.0;
        double agreement = compared == 0 ? 0 : agreed * 100.0 / compared;
        return new BenchmarkResult(difficulty, batchSize, compared, inconclusive, prefix, naiveStats, optimizedStats,
                reduction, agreement, clock.millis());
    }

    private void warmUp(Difficulty difficulty, String prefix, SudokuSolver naive, SudokuSolver optimized) {
        for (int i = 0; i < WARMUP_RUNS; i++) {
            Board board = puzzleGenerator.generate(difficulty, prefix + "-warmup-" + i);
            int[][] givens = new int[SIZE][SIZE];
            for (int row = 0; row < SIZE; row++) {
                for (int col = 0; col < SIZE; col++) {
                    Cell cell = board.getCell(row, col);
                    givens[row][col] = cell.isGiven() ? cell.getSolutionValue() : Cell.EMPTY;
                }
            }
            optimized.solve(givens, board.getCages());
            naive.solve(givens, board.getCages());
        }
    }

    private static BenchmarkResult.StrategyStats stats(SolverStrategyType strategy, List<AlgorithmMetrics> runs) {
        List<Double> latencies = new ArrayList<>(runs.size());
        long peakMemory = 0;
        for (AlgorithmMetrics run : runs) {
            latencies.add(run.executionTimeMs());
            peakMemory = Math.max(peakMemory, run.memoryBytes());
        }
        Collections.sort(latencies);
        double count = Math.max(1, runs.size());
        return new BenchmarkResult.StrategyStats(
                strategy,
                percentile(latencies, 0.50),
                percentile(latencies, 0.95),
                total(runs, AlgorithmMetrics::nodesVisited) / count,
                total(runs, AlgorithmMetrics::prunedBranches) / count,
                peakMemory);
    }

    static double percentile(List<Double> sortedAscending, double fraction) {
        if (sortedAscending.isEmpty()) {
            return 0;
        }
        int rank = (int) Math.ceil(fraction * sortedAscending.size());
        return sortedAscending.get(Math.min(sortedAscending.size(), Math.max(1, rank)) - 1);
    }

    private static double total(List<AlgorithmMetrics> runs, ToDoubleFunction<AlgorithmMetrics> field) {
        double sum = 0;
        for (AlgorithmMetrics run : runs) {
            sum += field.applyAsDouble(run);
        }
        return sum;
    }

    private static String resolvePrefix(String requested) {
        if (requested == null || requested.isBlank()) {
            return DEFAULT_SEED_PREFIX;
        }
        String cleaned = requested.trim();
        if (cleaned.length() > MAX_SEED_PREFIX_LENGTH || cleaned.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(
                    "seedPrefix must be at most " + MAX_SEED_PREFIX_LENGTH + " printable characters");
        }
        return cleaned;
    }
}
