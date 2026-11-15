package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Position;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

public final class SudokuSolver {

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

    public boolean solve(int[][] grid, List<Cage> cages) {
        return solve(grid, cages, null);
    }

    public boolean solve(int[][] grid, List<Cage> cages, Random rng) {
        Search search = new Search(grid, cages, 1, null, rng);
        if (search.run() == 0) {
            return false;
        }
        search.copyFirstSolutionTo(grid);
        return true;
    }

    public boolean hasUniqueSolution(int[][] grid, List<Cage> cages) {
        return countSolutions(grid, cages, 2) == 1;
    }

    public int countSolutions(int[][] grid, List<Cage> cages, int limit) {
        if (limit < 1) {
            throw new IllegalArgumentException("limit must be at least 1: " + limit);
        }
        return new Search(grid, cages, limit, null, null).run();
    }

    public int[][] findAlternativeSolution(int[][] grid, List<Cage> cages, int[][] knownSolution) {
        Search search = new Search(grid, cages, 1, flatten(knownSolution), null);
        if (search.run() == 0) {
            return null;
        }
        int[][] alternative = new int[SIZE][SIZE];
        search.copyFirstSolutionTo(alternative);
        return alternative;
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

    private static final class Search {

        private final int[] cells = new int[CELL_COUNT];
        private final int[] rowMask = new int[SIZE];
        private final int[] colMask = new int[SIZE];
        private final int[] boxMask = new int[SIZE];
        private final int[] cageOf = new int[CELL_COUNT];
        private final int[] cageUsed;
        private final int[] cageSum;
        private final int[] cageRemaining;
        private final int[] cageTarget;
        private final int limit;
        private final int[] excluded;
        private final Random rng;
        private boolean consistent = true;
        private int found;
        private int[] firstSolution;

        Search(int[][] grid, List<Cage> cages, int limit, int[] excluded, Random rng) {
            validateShape(grid);
            this.limit = limit;
            this.excluded = excluded;
            this.rng = rng;
            int cageCount = cages == null ? 0 : cages.size();
            cageUsed = new int[cageCount];
            cageSum = new int[cageCount];
            cageRemaining = new int[cageCount];
            cageTarget = new int[cageCount];
            Arrays.fill(cageOf, -1);
            for (int k = 0; k < cageCount; k++) {
                Cage cage = cages.get(k);
                cageTarget[k] = cage.targetSum();
                cageRemaining[k] = cage.size();
                for (Position position : cage.cells()) {
                    int idx = position.row() * SIZE + position.col();
                    if (cageOf[idx] != -1) {
                        throw new IllegalArgumentException("Cell " + position + " belongs to more than one cage");
                    }
                    cageOf[idx] = k;
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

        int run() {
            if (consistent) {
                dfs();
            }
            return found;
        }

        void copyFirstSolutionTo(int[][] target) {
            for (int idx = 0; idx < CELL_COUNT; idx++) {
                target[idx / SIZE][idx % SIZE] = firstSolution[idx];
            }
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
            boolean stop = dfs();
            unplace(idx, value);
            return stop;
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

        private int candidates(int idx) {
            int row = idx / SIZE;
            int col = idx % SIZE;
            int available = ~(rowMask[row] | colMask[col] | boxMask[BOX_OF[idx]]) & ALL_DIGITS;
            int cage = cageOf[idx];
            if (cage < 0) {
                return available;
            }
            available &= ~cageUsed[cage];
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
