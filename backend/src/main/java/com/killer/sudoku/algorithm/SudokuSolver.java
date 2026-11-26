package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.SolverStrategyType;
import java.util.List;
import java.util.Random;

public interface SudokuSolver {

    SolverStrategyType strategy();

    SolveResult solve(int[][] grid, List<Cage> cages);

    SolveResult solve(int[][] grid, List<Cage> cages, Random rng);

    CountResult countSolutions(int[][] grid, List<Cage> cages, int limit);

    SolveResult findAlternativeSolution(int[][] grid, List<Cage> cages, int[][] knownSolution);

    default boolean hasUniqueSolution(int[][] grid, List<Cage> cages) {
        return countSolutions(grid, cages, 2).unique();
    }

    record SolveResult(boolean solved, int[][] solution, AlgorithmMetrics metrics) {
    }

    record CountResult(int solutionsFound, boolean completed, AlgorithmMetrics metrics) {

        public boolean unique() {
            return completed && solutionsFound == 1;
        }
    }
}
