package com.killer.sudoku.algorithm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.SolverStrategyType;
import java.util.List;
import org.junit.jupiter.api.Test;

class OptimizedBacktrackingSolverTest extends SudokuSolverTest {

    @Override
    SudokuSolver createSolver() {
        return new OptimizedBacktrackingSolver();
    }

    @Override
    SolverStrategyType expectedStrategy() {
        return SolverStrategyType.OPTIMIZED_MRV_PRUNING;
    }

    @Test
    void recordsPrunedBranchesOnKillerPuzzles() {
        int[][] solution = parse(SOLUTION);
        int[][] grid = new int[9][9];
        grid[0][0] = solution[0][0];
        SudokuSolver.SolveResult result = createSolver().solve(grid, rowTripleCages(solution));
        assertTrue(result.solved());
        assertTrue(result.metrics().prunedBranches() > 0);
        assertFalse(result.metrics().oracleVerified());
    }

    @Test
    void cageBoundsRejectUnreachableTargetBeforeAnyAssignment() {
        com.killer.sudoku.model.Cage impossible = new com.killer.sudoku.model.Cage(0,
                List.of(new com.killer.sudoku.model.Position(0, 0), new com.killer.sudoku.model.Position(0, 1),
                        new com.killer.sudoku.model.Position(0, 2)), 5);
        SudokuSolver.CountResult result = createSolver().countSolutions(new int[9][9], List.of(impossible), 2);
        assertEquals(0, result.solutionsFound());
        assertEquals(0, result.metrics().nodesVisited());
        assertTrue(result.metrics().prunedBranches() >= 1);
    }
}
