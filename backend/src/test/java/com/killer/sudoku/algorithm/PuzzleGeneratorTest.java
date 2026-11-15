package com.killer.sudoku.algorithm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import java.util.HashSet;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

class PuzzleGeneratorTest {

    private final SudokuSolver solver = new SudokuSolver();
    private final PuzzleGenerator generator =
            new PuzzleGenerator(solver, new BacktrackingCageGenerator(solver));

    @Test
    void generatesValidUniquelySolvablePuzzlesForEveryDifficulty() {
        for (Difficulty difficulty : Difficulty.values()) {
            for (int i = 0; i < 5; i++) {
                Board board = generator.generate(difficulty, "unique-" + difficulty + i);
                int[][] solution = solutionOf(board);
                assertValidSudoku(solution);
                BacktrackingCageGeneratorTest.assertValidPartition(solution, board.getCages());
                int[][] givens = givensOf(board);
                assertTrue(solver.hasUniqueSolution(givens, board.getCages()));
                int[][] solved = givensOf(board);
                assertTrue(solver.solve(solved, board.getCages()));
                assertTrue(java.util.Arrays.deepEquals(solution, solved));
            }
        }
    }

    @Test
    void revealsAtLeastTheDifficultyTarget() {
        assertTrue(givenCount(generator.generate(Difficulty.EASY, "g")) >= 30);
        assertTrue(givenCount(generator.generate(Difficulty.MEDIUM, "g")) >= 22);
        assertTrue(givenCount(generator.generate(Difficulty.HARD, "g")) >= 14);
        assertTrue(givenCount(generator.generate(Difficulty.EASY, "g"))
                > givenCount(generator.generate(Difficulty.HARD, "g")));
    }

    @Test
    void sameSeedProducesIdenticalPuzzle() {
        Board a = generator.generate(Difficulty.MEDIUM, "2026-11-15");
        Board b = generator.generate(Difficulty.MEDIUM, "2026-11-15");
        assertTrue(java.util.Arrays.deepEquals(solutionOf(a), solutionOf(b)));
        assertTrue(java.util.Arrays.deepEquals(givensOf(a), givensOf(b)));
        assertEquals(a.getCages(), b.getCages());
    }

    @Test
    void differentSeedsProduceDifferentPuzzles() {
        Board a = generator.generate(Difficulty.MEDIUM, "seed-a");
        Board b = generator.generate(Difficulty.MEDIUM, "seed-b");
        assertFalse(java.util.Arrays.deepEquals(solutionOf(a), solutionOf(b)));
        assertNotEquals(a.getCages(), b.getCages());
    }

    @Test
    void explicitRandomIsDeterministicToo() {
        Board a = generator.generate(Difficulty.HARD, new Random(99));
        Board b = generator.generate(Difficulty.HARD, new Random(99));
        assertEquals(a.getCages(), b.getCages());
    }

    @Test
    void rejectsBlankSeed() {
        assertThrows(IllegalArgumentException.class, () -> generator.generate(Difficulty.EASY, " "));
        assertThrows(IllegalArgumentException.class, () -> generator.generate(Difficulty.EASY, (String) null));
    }

    private static int givenCount(Board board) {
        return 81 - board.getEmptyCellsCount();
    }

    private static int[][] solutionOf(Board board) {
        int[][] grid = new int[9][9];
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                grid[row][col] = board.getCell(row, col).getSolutionValue();
            }
        }
        return grid;
    }

    private static int[][] givensOf(Board board) {
        int[][] grid = new int[9][9];
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                Cell cell = board.getCell(row, col);
                grid[row][col] = cell.isGiven() ? cell.getSolutionValue() : 0;
            }
        }
        return grid;
    }

    private static void assertValidSudoku(int[][] grid) {
        for (int i = 0; i < 9; i++) {
            Set<Integer> row = new HashSet<>();
            Set<Integer> col = new HashSet<>();
            Set<Integer> box = new HashSet<>();
            for (int j = 0; j < 9; j++) {
                row.add(grid[i][j]);
                col.add(grid[j][i]);
                box.add(grid[(i / 3) * 3 + j / 3][(i % 3) * 3 + j % 3]);
            }
            assertEquals(9, row.size());
            assertEquals(9, col.size());
            assertEquals(9, box.size());
        }
    }
}
