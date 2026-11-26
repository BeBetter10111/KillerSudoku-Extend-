package com.killer.sudoku.algorithm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.SolverStrategyType;
import java.util.List;
import org.junit.jupiter.api.Test;

class NaiveBacktrackingSolverTest extends SudokuSolverTest {

    @Override
    SudokuSolver createSolver() {
        return new NaiveBacktrackingSolver();
    }

    @Override
    SolverStrategyType expectedStrategy() {
        return SolverStrategyType.NAIVE_ORACLE;
    }

    @Test
    void neverPrunesAndMarksItselfAsOracle() {
        int[][] solution = parse(SOLUTION);
        SudokuSolver.SolveResult result = createSolver().solve(new int[9][9], rowTripleCages(solution));
        assertTrue(result.solved());
        assertEquals(0, result.metrics().prunedBranches());
        assertTrue(result.metrics().oracleVerified());
    }

    @Test
    void nodeBudgetMakesSearchInconclusiveInsteadOfWrong() {
        SudokuSolver.CountResult result = new NaiveBacktrackingSolver(10).countSolutions(new int[9][9], List.of(), 2);
        assertFalse(result.completed());
        assertFalse(result.unique());
        assertTrue(result.metrics().nodesVisited() <= 11);
    }

    @Test
    void rejectsNonPositiveBudget() {
        assertThrows(IllegalArgumentException.class, () -> new NaiveBacktrackingSolver(0));
    }
}
