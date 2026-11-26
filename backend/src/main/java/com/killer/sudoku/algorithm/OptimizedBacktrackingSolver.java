package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

public final class OptimizedBacktrackingSolver implements SudokuSolver {
    private final long maxNodes;

    public OptimizedBacktrackingSolver() {
        this(Long.MAX_VALUE);
    }

    public OptimizedBacktrackingSolver(long maxNodes) {
        if (maxNodes < 1) {
            throw new IllegalArgumentException("maxNodes must be at least 1: " + maxNodes);
        }
        this.maxNodes = maxNodes;
    }

    private static final int SIZE = Board.SIZE;
    private static final int CELL_COUNT = SIZE * SIZE;
    private static final int ALL_DIGITS = (1 << SIZE) - 1;
    private static final int UNREACHABLE_MIN = 1_000;
    private static final int UNREACHABLE_MAX = -1;
    private static final int[][] MIN_SUM = new int[ALL_DIGITS + 1][SIZE + 1];
    private static final int[][] MAX_SUM = new int[ALL_DIGITS + 1][SIZE + 1];
    private static final int[] BOX_OF = new int[CELL_COUNT];

    static {
        for (int mask = 0; mask <= ALL_DIGITS; mask++) {
            int count = Integer.bitCount(mask);
            int[] digits = new int[count];
            int n = 0;
            for (int d = 1; d <= SIZE; d++) {
                if ((mask & (1 << (d - 1))) != 0) {
                    digits[n++] = d;
                }
            }
            for (int k = 0; k <= SIZE; k++) {
                if (k > count) {
                    MIN_SUM[mask][k] = UNREACHABLE_MIN;
                    MAX_SUM[mask][k] = UNREACHABLE_MAX;
                    continue;
                }
                int min = 0;
                int max = 0;
                for (int i = 0; i < k; i++) {
                    min += digits[i];
                    max += digits[count - 1 - i];
                }
                MIN_SUM[mask][k] = min;
                MAX_SUM[mask][k] = max;
            }
        }
        for (int idx = 0; idx < CELL_COUNT; idx++) {
            BOX_OF[idx] = (idx / SIZE / Board.BOX_SIZE) * Board.BOX_SIZE + (idx % SIZE) / Board.BOX_SIZE;
        }
    }

    @Override
    public SolverStrategyType strategy() {
        return SolverStrategyType.OPTIMIZED_MRV_PRUNING;
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
        return toSolveResult(execute(grid, cages, 1, flatten(knownSolution), null));
    }

    private Outcome execute(int[][] grid, List<Cage> cages, int limit, int[] excluded, Random rng) {
        validateShape(grid);
        ResourceMeter.Reading reading = ResourceMeter.start();
        Search search = new Search(grid, cages, limit, excluded, rng, maxNodes);
        search.run();
        ResourceMeter.Measurement measurement = ResourceMeter.stop(reading);
        AlgorithmMetrics metrics = new AlgorithmMetrics(SolverStrategyType.OPTIMIZED_MRV_PRUNING,
                AlgorithmMetrics.SOLVE, measurement.millis(), search.nodes, search.pruned, 0, measurement.bytes(),
                false);
        return new Outcome(search.found, search.completed(), search.solutionGrid(), metrics);
    }

    private static SolveResult toSolveResult(Outcome outcome) {
        return new SolveResult(outcome.found > 0, outcome.solution, outcome.metrics);
    }

    private static int[] flatten(int[][] grid) {
        validateShape(grid);
        int[] flat = new int[CELL_COUNT];
        for (int row = 0; row < SIZE; row++) {
            System.arraycopy(grid[row], 0, flat, row * SIZE, SIZE);
        }
        return flat;
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

        private final int[] cells = new int[CELL_COUNT];
        private final int[] rowMask = new int[SIZE];
        private final int[] colMask = new int[SIZE];
        private final int[] boxMask = new int[SIZE];
        private final int[] cageOf = new int[CELL_COUNT];
        private final int[][] cageCells;
        private final int[] cageUsed;
        private final int[] cageSum;
        private final int[] cageRemaining;
        private final int[] cageTarget;
        private final int limit;
        private final int[] excluded;
        private final Random rng;
        private final long maxNodes;
        private boolean consistent = true;
        private boolean aborted;
        private long nodes;
        private long pruned;
        private int found;
        private int[] firstSolution;

        Search(int[][] grid, List<Cage> cages, int limit, int[] excluded, Random rng, long maxNodes) {
            this.limit = limit;
            this.excluded = excluded;
            this.rng = rng;
            this.maxNodes = maxNodes;
            int cageCount = cages == null ? 0 : cages.size();
            cageCells = new int[cageCount][];
            cageUsed = new int[cageCount];
            cageSum = new int[cageCount];
            cageRemaining = new int[cageCount];
            cageTarget = new int[cageCount];
            Arrays.fill(cageOf, -1);
            for (int k = 0; k < cageCount; k++) {
                Cage cage = cages.get(k);
                cageTarget[k] = cage.targetSum();
                cageRemaining[k] = cage.size();
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
            for (int idx = 0; idx < CELL_COUNT && consistent; idx++) {
                int value = grid[idx / SIZE][idx % SIZE];
                if (value == 0) {
                    continue;
                }
                if ((candidates(idx) & (1 << (value - 1))) == 0) {
                    consistent = false;
                } else {
                    place(idx, value);
                }
            }
        }

        void run() {
            if (consistent) {
                dfs();
            }
        }

        boolean completed() {
            return !aborted;
        }

        int[][] solutionGrid() {
            if (firstSolution == null) {
                return null;
            }
            int[][] solution = new int[SIZE][SIZE];
            for (int idx = 0; idx < CELL_COUNT; idx++) {
                solution[idx / SIZE][idx % SIZE] = firstSolution[idx];
            }
            return solution;
        }

        private boolean dfs() {
            int best = -1;
            int bestMask = 0;
            int bestCount = SIZE + 1;
            for (int idx = 0; idx < CELL_COUNT; idx++) {
                if (cells[idx] != 0) {
                    continue;
                }
                int mask = candidates(idx);
                int count = Integer.bitCount(mask);
                if (count == 0) {
                    pruned++;
                    return false;
                }
                if (count < bestCount) {
                    best = idx;
                    bestMask = mask;
                    bestCount = count;
                    if (count == 1) {
                        break;
                    }
                }
            }
            if (best < 0) {
                return onSolution();
            }
            pruned += Integer.bitCount(basicCandidates(best)) - bestCount;
            if (rng == null) {
                for (int m = bestMask; m != 0; m &= m - 1) {
                    if (tryValue(best, Integer.numberOfTrailingZeros(m) + 1)) {
                        return true;
                    }
                }
                return false;
            }
            int[] values = new int[bestCount];
            int n = 0;
            for (int m = bestMask; m != 0; m &= m - 1) {
                values[n++] = Integer.numberOfTrailingZeros(m) + 1;
            }
            Randoms.shuffle(values, n, rng);
            for (int value : values) {
                if (tryValue(best, value)) {
                    return true;
                }
            }
            return false;
        }

        private boolean tryValue(int idx, int value) {
            place(idx, value);
            nodes++;
            if (nodes > maxNodes) {
                aborted = true;
                unplace(idx, value);
                return true;
            }
            if (!forwardCheck(idx)) {
                pruned++;
                unplace(idx, value);
                return false;
            }
            boolean stop = dfs();
            unplace(idx, value);
            return stop;
        }

        private boolean forwardCheck(int idx) {
            int row = idx / SIZE;
            int col = idx % SIZE;
            for (int i = 0; i < SIZE; i++) {
                if (i != col && hasNoCandidates(row * SIZE + i)) {
                    return false;
                }
                if (i != row && hasNoCandidates(i * SIZE + col)) {
                    return false;
                }
            }
            int boxRow = row - row % Board.BOX_SIZE;
            int boxCol = col - col % Board.BOX_SIZE;
            for (int r = boxRow; r < boxRow + Board.BOX_SIZE; r++) {
                for (int c = boxCol; c < boxCol + Board.BOX_SIZE; c++) {
                    if (r != row && c != col && hasNoCandidates(r * SIZE + c)) {
                        return false;
                    }
                }
            }
            int cage = cageOf[idx];
            if (cage >= 0) {
                for (int peer : cageCells[cage]) {
                    if (hasNoCandidates(peer)) {
                        return false;
                    }
                }
            }
            return true;
        }

        private boolean hasNoCandidates(int idx) {
            return cells[idx] == 0 && candidates(idx) == 0;
        }

        private boolean onSolution() {
            if (excluded != null && Arrays.equals(cells, excluded)) {
                return false;
            }
            found++;
            if (firstSolution == null) {
                firstSolution = cells.clone();
            }
            return found >= limit;
        }

        private int basicCandidates(int idx) {
            int available = ~(rowMask[idx / SIZE] | colMask[idx % SIZE] | boxMask[BOX_OF[idx]]) & ALL_DIGITS;
            int cage = cageOf[idx];
            return cage < 0 ? available : available & ~cageUsed[cage];
        }

        private int candidates(int idx) {
            int available = basicCandidates(idx);
            int cage = cageOf[idx];
            if (cage < 0) {
                return available;
            }
            int others = cageRemaining[cage] - 1;
            int remainingSum = cageTarget[cage] - cageSum[cage];
            int result = 0;
            for (int m = available; m != 0; m &= m - 1) {
                int bit = m & -m;
                int value = Integer.numberOfTrailingZeros(bit) + 1;
                int pool = ~(cageUsed[cage] | bit) & ALL_DIGITS;
                int need = remainingSum - value;
                if (need >= MIN_SUM[pool][others] && need <= MAX_SUM[pool][others]) {
                    result |= bit;
                }
            }
            return result;
        }

        private void place(int idx, int value) {
            int bit = 1 << (value - 1);
            cells[idx] = value;
            rowMask[idx / SIZE] |= bit;
            colMask[idx % SIZE] |= bit;
            boxMask[BOX_OF[idx]] |= bit;
            int cage = cageOf[idx];
            if (cage >= 0) {
                cageUsed[cage] |= bit;
                cageSum[cage] += value;
                cageRemaining[cage]--;
            }
        }

        private void unplace(int idx, int value) {
            int bit = 1 << (value - 1);
            cells[idx] = 0;
            rowMask[idx / SIZE] &= ~bit;
            colMask[idx % SIZE] &= ~bit;
            boxMask[BOX_OF[idx]] &= ~bit;
            int cage = cageOf[idx];
            if (cage >= 0) {
                cageUsed[cage] &= ~bit;
                cageSum[cage] -= value;
                cageRemaining[cage]++;
            }
        }
    }
}
