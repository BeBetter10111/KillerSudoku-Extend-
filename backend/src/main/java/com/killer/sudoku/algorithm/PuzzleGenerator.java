package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Random;

public final class PuzzleGenerator {

    private static final int SIZE = Board.SIZE;
    private static final int CELL_COUNT = SIZE * SIZE;

    private final SudokuSolver solver;
    private final BacktrackingCageGenerator cageGenerator;

    public PuzzleGenerator(SudokuSolver solver, BacktrackingCageGenerator cageGenerator) {
        this.solver = solver;
        this.cageGenerator = cageGenerator;
    }

    public Board generate(Difficulty difficulty, String seed) {
        if (seed == null || seed.isBlank()) {
            throw new IllegalArgumentException("seed must not be blank");
        }
        return generate(difficulty, new Random(seedToLong(seed)));
    }

    public Board generate(Difficulty difficulty, Random rng) {
        int[][] solution = randomSolution(rng);
        List<Cage> cages = cageGenerator.generateCages(solution, difficulty, rng);
        int[][] puzzle = revealGivens(solution, givenTarget(difficulty), rng);
        ensureUniqueSolution(puzzle, solution, cages, rng);
        return buildBoard(solution, puzzle, cages);
    }

    private int[][] randomSolution(Random rng) {
        int[][] grid = new int[SIZE][SIZE];
        if (!solver.solve(grid, List.of(), rng)) {
            throw new IllegalStateException("Unable to generate a complete Sudoku grid");
        }
        return grid;
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

    private void ensureUniqueSolution(int[][] puzzle, int[][] solution, List<Cage> cages, Random rng) {
        int[][] alternative = solver.findAlternativeSolution(puzzle, cages, solution);
        while (alternative != null) {
            int[] differing = new int[CELL_COUNT];
            int n = 0;
            for (int idx = 0; idx < CELL_COUNT; idx++) {
                if (alternative[idx / SIZE][idx % SIZE] != solution[idx / SIZE][idx % SIZE]) {
                    differing[n++] = idx;
                }
            }
            int reveal = differing[rng.nextInt(n)];
            puzzle[reveal / SIZE][reveal % SIZE] = solution[reveal / SIZE][reveal % SIZE];
            alternative = solver.findAlternativeSolution(puzzle, cages, solution);
        }
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
