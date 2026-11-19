package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.SolverStrategyType;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Random;

public final class PuzzleGenerator {

    private static final int SIZE = Board.SIZE;
    private static final int CELL_COUNT = SIZE * SIZE;
    private static final SolverStrategyType DEFAULT_STRATEGY = SolverStrategyType.OPTIMIZED_MRV_PRUNING;

    private final BacktrackingCageGenerator cageGenerator;

    public PuzzleGenerator(BacktrackingCageGenerator cageGenerator) {
        this.cageGenerator = cageGenerator;
    }

    public Board generate(Difficulty difficulty, String seed) {
        return generateWithMetrics(difficulty, seed, DEFAULT_STRATEGY).board();
    }

    public Board generate(Difficulty difficulty, Random rng) {
        return generateWithMetrics(difficulty, rng, DEFAULT_STRATEGY).board();
    }

    public GeneratedPuzzle generateWithMetrics(Difficulty difficulty, String seed, SolverStrategyType strategy) {
        if (seed == null || seed.isBlank()) {
            throw new IllegalArgumentException("seed must not be blank");
        }
        return generateWithMetrics(difficulty, new Random(seedToLong(seed)), strategy);
    }

    public GeneratedPuzzle generateWithMetrics(Difficulty difficulty, Random rng, SolverStrategyType strategy) {
        SudokuSolver solver = SolverFactory.forStrategy(strategy);
        ResourceMeter.Reading reading = ResourceMeter.start();
        AlgorithmMetrics total = AlgorithmMetrics.empty(strategy, AlgorithmMetrics.PUZZLE_GEN);

        SudokuSolver.SolveResult fullGrid = solver.solve(new int[SIZE][SIZE], List.of(), rng);
        if (!fullGrid.solved()) {
            throw new IllegalStateException("Unable to generate a complete Sudoku grid");
        }
        int[][] solution = fullGrid.solution();
        total = total.plus(fullGrid.metrics());

        CageLayoutResult layout = cageGenerator.generateCagesWithMetrics(solution, difficulty, strategy, rng);
        List<Cage> cages = layout.cages();
        total = total.plus(layout.metrics());

        int[][] puzzle = revealGivens(solution, givenTarget(difficulty), rng);
        total = total.plus(ensureUniqueSolution(solver, puzzle, solution, cages, rng));

        ResourceMeter.Measurement measurement = ResourceMeter.stop(reading);
        total = total.withTiming(measurement.millis(), measurement.bytes());

        boolean verified = verifyWithOracle(strategy, puzzle, cages);
        return new GeneratedPuzzle(buildBoard(solution, puzzle, cages), total.withOracleVerified(verified));
    }

    private static int[][] revealGivens(int[][] solution, int count, Random rng) {
        int[] order = new int[CELL_COUNT];
        for (int i = 0; i < CELL_COUNT; i++) {
            order[i] = i;
        }
        Randoms.shuffle(order, CELL_COUNT, rng);
        int[][] puzzle = new int[SIZE][SIZE];
        for (int i = 0; i < count; i++) {
            int row = order[i] / SIZE;
            int col = order[i] % SIZE;
            puzzle[row][col] = solution[row][col];
        }
        return puzzle;
    }

    private static AlgorithmMetrics ensureUniqueSolution(
            SudokuSolver solver, int[][] puzzle, int[][] solution, List<Cage> cages, Random rng) {
        AlgorithmMetrics accumulated = AlgorithmMetrics.empty(solver.strategy(), AlgorithmMetrics.PUZZLE_GEN);
        SudokuSolver.SolveResult alternative = solver.findAlternativeSolution(puzzle, cages, solution);
        accumulated = accumulated.plus(alternative.metrics());
        while (alternative.solved()) {
            int[][] other = alternative.solution();
            int[] differing = new int[CELL_COUNT];
            int n = 0;
            for (int idx = 0; idx < CELL_COUNT; idx++) {
                if (other[idx / SIZE][idx % SIZE] != solution[idx / SIZE][idx % SIZE]) {
                    differing[n++] = idx;
                }
            }
            int reveal = differing[rng.nextInt(n)];
            puzzle[reveal / SIZE][reveal % SIZE] = solution[reveal / SIZE][reveal % SIZE];
            alternative = solver.findAlternativeSolution(puzzle, cages, solution);
            accumulated = accumulated.plus(alternative.metrics());
        }
        return accumulated;
    }

    private static boolean verifyWithOracle(SolverStrategyType strategy, int[][] puzzle, List<Cage> cages) {
        if (strategy == SolverStrategyType.NAIVE_ORACLE) {
            return true;
        }
        SudokuSolver.CountResult result = SolverFactory.boundedOracle().countSolutions(puzzle, cages, 2);
        if (!result.completed()) {
            return false;
        }
        if (result.solutionsFound() != 1) {
            throw new IllegalStateException("Reference oracle disagrees with " + strategy
                    + ": found " + result.solutionsFound() + " solutions for a puzzle reported unique");
        }
        return true;
    }

    private static Board buildBoard(int[][] solution, int[][] puzzle, List<Cage> cages) {
        Cell[][] cells = new Cell[SIZE][SIZE];
        for (int row = 0; row < SIZE; row++) {
            for (int col = 0; col < SIZE; col++) {
                cells[row][col] = new Cell(row, col, solution[row][col], puzzle[row][col] != Cell.EMPTY);
            }
        }
        return new Board(cells, cages);
    }

    private static int givenTarget(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> 30;
            case MEDIUM -> 22;
            case HARD -> 14;
        };
    }

    private static long seedToLong(String seed) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(seed.getBytes(StandardCharsets.UTF_8));
            long value = 0;
            for (int i = 0; i < Long.BYTES; i++) {
                value = (value << Byte.SIZE) | (hash[i] & 0xFF);
            }
            return value;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
