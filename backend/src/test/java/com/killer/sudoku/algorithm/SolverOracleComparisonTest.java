package com.killer.sudoku.algorithm;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.SolverStrategyType;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class SolverOracleComparisonTest {

    private final SudokuSolver naive = SolverFactory.forStrategy(SolverStrategyType.NAIVE_ORACLE);
    private final SudokuSolver optimized = SolverFactory.forStrategy(SolverStrategyType.OPTIMIZED_MRV_PRUNING);
    private final PuzzleGenerator generator = new PuzzleGenerator(new BacktrackingCageGenerator());

    @Test
    void optimizedMatchesOracleOnGeneratedKillerPuzzles() {
        long naiveNodes = 0;
        long optimizedNodes = 0;
        long optimizedPruned = 0;
        for (Difficulty difficulty : Difficulty.values()) {
            for (int i = 0; i < 8; i++) {
                Board board = generator.generate(difficulty, "oracle-" + difficulty + i);
                int[][] givens = givensOf(board);

                SudokuSolver.SolveResult expected = naive.solve(givens, board.getCages());
                SudokuSolver.SolveResult actual = optimized.solve(givens, board.getCages());
                assertTrue(expected.solved());
                assertTrue(actual.solved());
                assertArrayEquals(expected.solution(), actual.solution());

                SudokuSolver.CountResult oracleCount = naive.countSolutions(givens, board.getCages(), 2);
                SudokuSolver.CountResult optimizedCount = optimized.countSolutions(givens, board.getCages(), 2);
                assertEquals(oracleCount.solutionsFound(), optimizedCount.solutionsFound());
                assertTrue(oracleCount.unique());

                naiveNodes += oracleCount.metrics().nodesVisited();
                optimizedNodes += optimizedCount.metrics().nodesVisited();
                optimizedPruned += optimizedCount.metrics().prunedBranches();
            }
        }
        assertTrue(optimizedNodes < naiveNodes, "optimized " + optimizedNodes + " vs naive " + naiveNodes);
        assertTrue(optimizedPruned > 0);
    }

    @Test
    void solversAgreeOnNonUniqueAndInfeasibleInputs() {
        Board board = generator.generate(Difficulty.MEDIUM, "oracle-sparse");
        int[][] sparse = givensOf(board);
        List<int[]> blanks = new ArrayList<>();
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (sparse[r][c] != 0) {
                    blanks.add(new int[] {r, c});
                }
            }
        }
        Random rng = new Random(3);
        for (int i = 0; i < 6; i++) {
            int[] cell = blanks.remove(rng.nextInt(blanks.size()));
            sparse[cell[0]][cell[1]] = 0;
        }
        SudokuSolver.CountResult a = naive.countSolutions(sparse, board.getCages(), 3);
        SudokuSolver.CountResult b = optimized.countSolutions(sparse, board.getCages(), 3);
        assertEquals(a.solutionsFound(), b.solutionsFound());

        int[][] infeasible = givensOf(board);
        int[] target = firstGiven(infeasible);
        infeasible[target[0]][target[1]] = infeasible[target[0]][target[1]] % 9 + 1;
        assertEquals(0, naive.countSolutions(infeasible, board.getCages(), 2).solutionsFound());
        assertEquals(0, optimized.countSolutions(infeasible, board.getCages(), 2).solutionsFound());
    }

    private static int[] firstGiven(int[][] grid) {
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (grid[r][c] != 0) {
                    return new int[] {r, c};
                }
            }
        }
        throw new AssertionError("no given cell");
    }

    private static int[][] givensOf(Board board) {
        int[][] grid = new int[9][9];
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                Cell cell = board.getCell(r, c);
                grid[r][c] = cell.isGiven() ? cell.getSolutionValue() : 0;
            }
        }
        return grid;
    }
}
