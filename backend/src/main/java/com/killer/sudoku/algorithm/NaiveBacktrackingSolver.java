package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

public final class NaiveBacktrackingSolver implements SudokuSolver {

    private static final int SIZE = Board.SIZE;
    private static final int CELL_COUNT = SIZE * SIZE;

    private final long maxNodes;

    public NaiveBacktrackingSolver() {
        this(Long.MAX_VALUE);
    }

    public NaiveBacktrackingSolver(long maxNodes) {
        if (maxNodes < 1) {
            throw new IllegalArgumentException("maxNodes must be at least 1: " + maxNodes);
        }
        this.maxNodes = maxNodes;
    }

    @Override
    public SolverStrategyType strategy() {
        return SolverStrategyType.NAIVE_ORACLE;
    }

    @Override
    public SolveResult solve(int[][] grid, List<Cage> cages) {
        return solve(grid, cages, null);
    }

    @Override
    public SolveResult solve(int[][] grid, List<Cage> cages, Random rng) {
        return toSolveResult(execute(grid, cages, 1, null, rng));
    }

    @Override
    public CountResult countSolutions(int[][] grid, List<Cage> cages, int limit) {
        if (limit < 1) {
            throw new IllegalArgumentException("limit must be at least 1: " + limit);
        }
        Outcome outcome = execute(grid, cages, limit, null, null);
        return new CountResult(outcome.found, outcome.completed, outcome.metrics);
    }

    @Override
    public SolveResult findAlternativeSolution(int[][] grid, List<Cage> cages, int[][] knownSolution) {
        validateShape(knownSolution);
        return toSolveResult(execute(grid, cages, 1, knownSolution, null));
    }

    private Outcome execute(int[][] grid, List<Cage> cages, int limit, int[][] excluded, Random rng) {
        validateShape(grid);
        ResourceMeter.Reading reading = ResourceMeter.start();
        Search search = new Search(grid, cages, limit, excluded, rng, maxNodes);
        search.run();
        ResourceMeter.Measurement measurement = ResourceMeter.stop(reading);
        AlgorithmMetrics metrics = new AlgorithmMetrics(SolverStrategyType.NAIVE_ORACLE, AlgorithmMetrics.SOLVE,
                measurement.millis(), search.nodes, 0, 0, measurement.bytes(), true);
        return new Outcome(search.found, !search.aborted, search.firstSolution, metrics);
    }

    private static SolveResult toSolveResult(Outcome outcome) {
        return new SolveResult(outcome.found > 0, outcome.solution, outcome.metrics);
    }

    private static void validateShape(int[][] grid) {
        if (grid == null || grid.length != SIZE) {
            throw new IllegalArgumentException("Grid must have " + SIZE + " rows");
        }
        for (int row = 0; row < SIZE; row++) {
            if (grid[row] == null || grid[row].length != SIZE) {
                throw new IllegalArgumentException("Grid row " + row + " must have " + SIZE + " columns");
            }
            for (int col = 0; col < SIZE; col++) {
                if (grid[row][col] < 0 || grid[row][col] > SIZE) {
                    throw new IllegalArgumentException("Grid value out of range at (" + row + ", " + col + ")");
                }
            }
        }
    }

    private record Outcome(int found, boolean completed, int[][] solution, AlgorithmMetrics metrics) {
    }

    private static final class Search {

        private final int[][] cells = new int[SIZE][SIZE];
        private final int[] cageOf = new int[CELL_COUNT];
        private final int[][] cageCells;
        private final int[] cageTarget;
        private final int limit;
        private final int[][] excluded;
        private final Random rng;
        private final long maxNodes;
        private boolean consistent = true;
        private boolean aborted;
        private long nodes;
        private int found;
        private int[][] firstSolution;

        Search(int[][] grid, List<Cage> cages, int limit, int[][] excluded, Random rng, long maxNodes) {
            this.limit = limit;
            this.excluded = excluded;
            this.rng = rng;
            this.maxNodes = maxNodes;
            int cageCount = cages == null ? 0 : cages.size();
            cageCells = new int[cageCount][];
            cageTarget = new int[cageCount];
            Arrays.fill(cageOf, -1);
            for (int k = 0; k < cageCount; k++) {
                Cage cage = cages.get(k);
                cageTarget[k] = cage.targetSum();
                cageCells[k] = new int[cage.size()];
                int n = 0;
                for (Position position : cage.cells()) {
                    int idx = position.row() * SIZE + position.col();
                    if (cageOf[idx] != -1) {
                        throw new IllegalArgumentException("Cell " + position + " belongs to more than one cage");
                    }
                    cageOf[idx] = k;
                    cageCells[k][n++] = idx;
                }
            }
            for (int row = 0; row < SIZE; row++) {
                cells[row] = grid[row].clone();
            }
            for (int idx = 0; idx < CELL_COUNT && consistent; idx++) {
                int row = idx / SIZE;
                int col = idx % SIZE;
                int value = cells[row][col];
                if (value != 0) {
                    cells[row][col] = 0;
                    consistent = isValid(row, col, value);
                    cells[row][col] = value;
                }
            }
        }

        void run() {
            if (consistent) {
                dfs(0);
            }
        }

        private boolean dfs(int start) {
            int pos = start;
            while (pos < CELL_COUNT && cells[pos / SIZE][pos % SIZE] != 0) {
                pos++;
            }
            if (pos == CELL_COUNT) {
                return onSolution();
            }
            int row = pos / SIZE;
            int col = pos % SIZE;
            int[] order = digitOrder();
            for (int digit : order) {
                if (!isValid(row, col, digit)) {
                    continue;
                }
                cells[row][col] = digit;
                nodes++;
                if (nodes > maxNodes) {
                    aborted = true;
                    cells[row][col] = 0;
                    return true;
                }
                boolean stop = dfs(pos + 1);
                cells[row][col] = 0;
                if (stop) {
                    return true;
                }
            }
            return false;
        }

        private int[] digitOrder() {
            int[] order = {1, 2, 3, 4, 5, 6, 7, 8, 9};
            if (rng != null) {
                Randoms.shuffle(order, SIZE, rng);
            }
            return order;
        }

        private boolean onSolution() {
            if (excluded != null && Arrays.deepEquals(cells, excluded)) {
                return false;
            }
            found++;
            if (firstSolution == null) {
                firstSolution = new int[SIZE][SIZE];
                for (int row = 0; row < SIZE; row++) {
                    firstSolution[row] = cells[row].clone();
                }
            }
            return found >= limit;
        }

        private boolean isValid(int row, int col, int digit) {
            for (int i = 0; i < SIZE; i++) {
                if (cells[row][i] == digit || cells[i][col] == digit) {
                    return false;
                }
            }
            int boxRow = row - row % Board.BOX_SIZE;
            int boxCol = col - col % Board.BOX_SIZE;
            for (int r = boxRow; r < boxRow + Board.BOX_SIZE; r++) {
                for (int c = boxCol; c < boxCol + Board.BOX_SIZE; c++) {
                    if (cells[r][c] == digit) {
                        return false;
                    }
                }
            }
            int cage = cageOf[row * SIZE + col];
            if (cage < 0) {
                return true;
            }
            int sum = digit;
            boolean complete = true;
            for (int idx : cageCells[cage]) {
                if (idx == row * SIZE + col) {
                    continue;
                }
                int value = cells[idx / SIZE][idx % SIZE];
                if (value == digit) {
                    return false;
                }
                if (value == 0) {
                    complete = false;
                } else {
                    sum += value;
                }
            }
            return !complete || sum == cageTarget[cage];
        }
    }
}
