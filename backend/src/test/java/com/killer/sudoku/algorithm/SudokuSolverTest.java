package com.killer.sudoku.algorithm;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

abstract class SudokuSolverTest {

    static final String PUZZLE =
            "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
    static final String SOLUTION =
            "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

    abstract SudokuSolver createSolver();

    abstract SolverStrategyType expectedStrategy();

    private final SudokuSolver solver = createSolver();

    @Test
    void reportsItsStrategy() {
        assertEquals(expectedStrategy(), solver.strategy());
    }

    @Test
    void solvesClassicPuzzleWithoutMutatingInput() {
        int[][] grid = parse(PUZZLE);
        SudokuSolver.SolveResult result = solver.solve(grid, List.of());
        assertTrue(result.solved());
        assertArrayEquals(parse(SOLUTION), result.solution());
        assertArrayEquals(parse(PUZZLE), grid);
    }

    @Test
    void classicPuzzleHasUniqueSolution() {
        assertTrue(solver.hasUniqueSolution(parse(PUZZLE), List.of()));
    }

    @Test
    void emptyGridHasMultipleSolutionsAndStopsAtLimit() {
        assertFalse(solver.hasUniqueSolution(new int[9][9], List.of()));
        SudokuSolver.CountResult count = solver.countSolutions(new int[9][9], List.of(), 2);
        assertEquals(2, count.solutionsFound());
        assertTrue(count.completed());
    }

    @Test
    void contradictoryGivensHaveNoSolution() {
        int[][] grid = parse(PUZZLE);
        grid[0][2] = 5;
        assertFalse(solver.solve(grid, List.of()).solved());
        assertNull(solver.solve(grid, List.of()).solution());
        assertEquals(0, solver.countSolutions(grid, List.of(), 2).solutionsFound());
    }

    @Test
    void givensViolatingCageSumHaveNoSolution() {
        int[][] solution = parse(SOLUTION);
        List<Cage> cages = new ArrayList<>(rowTripleCages(solution));
        Cage first = cages.get(0);
        cages.set(0, new Cage(first.id(), first.cells(), first.targetSum() + 1));
        int[][] grid = new int[9][9];
        grid[0][0] = solution[0][0];
        grid[0][1] = solution[0][1];
        grid[0][2] = solution[0][2];
        assertFalse(solver.solve(grid, cages).solved());
        assertEquals(0, solver.countSolutions(grid, cages, 2).solutionsFound());
    }

    @Test
    void cagesConstrainSolutionAndDetectAlternatives() {
        int[][] solution = parse(SOLUTION);
        List<Cage> cages = rowTripleCages(solution);
        int[][] grid = new int[9][9];
        grid[0][0] = solution[0][0];
        SudokuSolver.SolveResult alternative = solver.findAlternativeSolution(grid, cages, solution);
        assertTrue(alternative.solved());
        assertNotNull(alternative.solution());
        assertFalse(Arrays.deepEquals(alternative.solution(), solution));
    }

    @Test
    void findAlternativeSolutionReportsNoneWhenUnique() {
        SudokuSolver.SolveResult result = solver.findAlternativeSolution(parse(PUZZLE), List.of(), parse(SOLUTION));
        assertFalse(result.solved());
        assertNull(result.solution());
    }

    @Test
    void randomizedSolveProducesValidDeterministicGrid() {
        SudokuSolver.SolveResult first = solver.solve(new int[9][9], List.of(), new Random(7));
        SudokuSolver.SolveResult second = solver.solve(new int[9][9], List.of(), new Random(7));
        assertTrue(first.solved());
        assertArrayEquals(first.solution(), second.solution());
        assertTrue(solver.hasUniqueSolution(first.solution(), List.of()));
    }

    @Test
    void rejectsMalformedGrid() {
        assertThrows(IllegalArgumentException.class, () -> solver.solve(new int[8][9], List.of()));
        int[][] outOfRange = new int[9][9];
        outOfRange[0][0] = 10;
        assertThrows(IllegalArgumentException.class, () -> solver.solve(outOfRange, List.of()));
        assertThrows(IllegalArgumentException.class, () -> solver.countSolutions(new int[9][9], List.of(), 0));
    }

    @Test
    void everyCallReportsSolveMetricsForItsStrategy() {
        AlgorithmMetrics metrics = solver.solve(parse(PUZZLE), List.of()).metrics();
        assertEquals(expectedStrategy(), metrics.strategyUsed());
        assertEquals(AlgorithmMetrics.SOLVE, metrics.operationType());
        assertTrue(metrics.nodesVisited() >= 51);
        assertTrue(metrics.executionTimeMs() >= 0);
        assertTrue(metrics.memoryBytes() >= 0);
        assertEquals(0, metrics.unionFindOps());
    }

    static int[][] parse(String digits) {
        int[][] grid = new int[9][9];
        for (int i = 0; i < 81; i++) {
            grid[i / 9][i % 9] = digits.charAt(i) - '0';
        }
        return grid;
    }

    static List<Cage> rowTripleCages(int[][] solution) {
        List<Cage> cages = new ArrayList<>();
        int id = 0;
        for (int row = 0; row < 9; row++) {
            for (int start = 0; start < 9; start += 3) {
                List<Position> positions = new ArrayList<>();
                int sum = 0;
                for (int col = start; col < start + 3; col++) {
                    positions.add(new Position(row, col));
                    sum += solution[row][col];
                }
                cages.add(new Cage(id++, positions, sum));
            }
        }
        return cages;
    }
}
