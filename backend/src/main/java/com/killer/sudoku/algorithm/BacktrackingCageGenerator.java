package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

public final class BacktrackingCageGenerator {

    private static final int SIZE = Board.SIZE;
    private static final int CELL_COUNT = SIZE * SIZE;
    private static final int MIN_CAGE_SIZE = 2;
    private static final int MAX_CAGE_SIZE = 5;
    private static final int PARTITION_STEP_BUDGET = 20_000;
    private static final int MAX_PARTITION_ATTEMPTS = 50;
    private static final int MAX_RESHAPE_ATTEMPTS = 30;
    private static final Difficulty RESHAPE_DIFFICULTY = Difficulty.MEDIUM;

    private static final int[][] DIRECTIONS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    private static final SolverStrategyType DEFAULT_STRATEGY = SolverStrategyType.OPTIMIZED_MRV_PRUNING;

    private enum OracleVerdict {
        AGREES,
        DISAGREES,
        INCONCLUSIVE
    }

    public List<Cage> generateCages(int[][] solvedGrid, Difficulty difficulty, Random rng) {
        return generateCagesWithMetrics(solvedGrid, difficulty, DEFAULT_STRATEGY, rng).cages();
    }

    public CageLayoutResult generateCagesWithMetrics(
            int[][] solvedGrid, Difficulty difficulty, SolverStrategyType strategy, Random rng) {
        int[] digits = flattenDigits(solvedGrid);
        int[] weights = sizeWeights(difficulty);
        ResourceMeter.Reading reading = ResourceMeter.start();
        long unionFindOps = 0;
        for (int attempt = 0; attempt < MAX_PARTITION_ATTEMPTS; attempt++) {
            Partition partition = new Partition(digits, weights, rng);
            boolean success = partition.run();
            if (success) {
                List<Cage> cages = partition.toCages();
                unionFindOps += partition.unionFind.operationCount();
                ResourceMeter.Measurement measurement = ResourceMeter.stop(reading);
                AlgorithmMetrics metrics = new AlgorithmMetrics(strategy, AlgorithmMetrics.PUZZLE_GEN,
                        measurement.millis(), 0, 0, unionFindOps, measurement.bytes(), false);
                return new CageLayoutResult(cages, metrics);
            }
            unionFindOps += partition.unionFind.operationCount();
        }
        throw new IllegalStateException("Unable to partition the grid into valid cages");
    }

    public List<Cage> reshapeCages(Board currentBoard, Random rng) {
        return reshapeCages(currentBoard, DEFAULT_STRATEGY, rng).cages();
    }

    public CageLayoutResult reshapeCages(Board currentBoard, SolverStrategyType strategy, Random rng) {
        int[][] solution = new int[SIZE][SIZE];
        int[][] known = new int[SIZE][SIZE];
        for (int row = 0; row < SIZE; row++) {
            for (int col = 0; col < SIZE; col++) {
                Cell cell = currentBoard.getCell(row, col);
                solution[row][col] = cell.getSolutionValue();
                known[row][col] = cell.isSolved() ? cell.getSolutionValue() : Cell.EMPTY;
            }
        }
        SudokuSolver solver = SolverFactory.forStrategy(strategy);
        AlgorithmMetrics total = AlgorithmMetrics.empty(strategy, AlgorithmMetrics.CAGE_RESHAPE);
        double millis = 0;
        long bytes = 0;
        for (int attempt = 0; attempt < MAX_RESHAPE_ATTEMPTS; attempt++) {
            ResourceMeter.Reading reading = ResourceMeter.start();
            CageLayoutResult layout = generateCagesWithMetrics(solution, RESHAPE_DIFFICULTY, strategy, rng);
            SudokuSolver.CountResult uniqueness = solver.countSolutions(known, layout.cages(), 2);
            ResourceMeter.Measurement measurement = ResourceMeter.stop(reading);
            total = total.plus(layout.metrics()).plus(uniqueness.metrics());
            millis += measurement.millis();
            bytes += measurement.bytes();
            if (!uniqueness.unique()) {
                continue;
            }
            OracleVerdict verdict = verifyWithOracle(strategy, known, layout.cages());
            if (verdict == OracleVerdict.DISAGREES) {
                continue;
            }
            return new CageLayoutResult(layout.cages(),
                    total.withTiming(millis, bytes).withOracleVerified(verdict == OracleVerdict.AGREES));
        }
        return new CageLayoutResult(currentBoard.getCages(), total.withTiming(millis, bytes));
    }

    private static OracleVerdict verifyWithOracle(SolverStrategyType strategy, int[][] known, List<Cage> cages) {
        if (strategy == SolverStrategyType.NAIVE_ORACLE) {
            return OracleVerdict.AGREES;
        }
        SudokuSolver.CountResult result = SolverFactory.boundedOracle().countSolutions(known, cages, 2);
        if (!result.completed()) {
            return OracleVerdict.INCONCLUSIVE;
        }
        return result.solutionsFound() == 1 ? OracleVerdict.AGREES : OracleVerdict.DISAGREES;
    }

    private static int[] sizeWeights(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> new int[] {35, 40, 20, 5};
            case MEDIUM -> new int[] {20, 35, 30, 15};
            case HARD -> new int[] {10, 25, 35, 30};
        };
    }

    private static int[] flattenDigits(int[][] grid) {
        if (grid == null || grid.length != SIZE) {
            throw new IllegalArgumentException("Grid must have " + SIZE + " rows");
        }
        int[] digits = new int[CELL_COUNT];
        for (int row = 0; row < SIZE; row++) {
            if (grid[row] == null || grid[row].length != SIZE) {
                throw new IllegalArgumentException("Grid row " + row + " must have " + SIZE + " columns");
            }
            for (int col = 0; col < SIZE; col++) {
                int value = grid[row][col];
                if (value < 1 || value > SIZE) {
                    throw new IllegalArgumentException("Solved grid value out of range at (" + row + ", " + col + ")");
                }
                digits[row * SIZE + col] = value;
            }
        }
        return digits;
    }

    private static final class Partition {

        private final int[] digits;
        private final int[] weights;
        private final Random rng;
        private final boolean[] taken = new boolean[CELL_COUNT];
        private final UnionFind unionFind = new UnionFind(CELL_COUNT);
        private int steps;

        Partition(int[] digits, int[] weights, Random rng) {
            this.digits = digits;
            this.weights = weights;
            this.rng = rng;
        }

        boolean run() {
            return partition();
        }

        List<Cage> toCages() {
            Map<Integer, List<Integer>> groups = new LinkedHashMap<>();
            for (int idx = 0; idx < CELL_COUNT; idx++) {
                groups.computeIfAbsent(unionFind.find(idx), root -> new ArrayList<>()).add(idx);
            }
            List<Cage> cages = new ArrayList<>(groups.size());
            int id = 0;
            for (List<Integer> members : groups.values()) {
                List<Position> positions = new ArrayList<>(members.size());
                int sum = 0;
                for (int idx : members) {
                    positions.add(new Position(idx / SIZE, idx % SIZE));
                    sum += digits[idx];
                }
                cages.add(new Cage(id++, positions, sum));
            }
            return cages;
        }

        private boolean partition() {
            if (++steps > PARTITION_STEP_BUDGET) {
                return false;
            }
            int seed = pickSeed();
            if (seed < 0) {
                return true;
            }
            if (freeNeighbors(seed) == 0) {
                return false;
            }
            taken[seed] = true;
            boolean[] banned = new boolean[CELL_COUNT];
            int[] region = new int[MAX_CAGE_SIZE];
            region[0] = seed;
            for (int size : sizeOrder()) {
                if (grow(region, 1, 1 << (digits[seed] - 1), banned, size, seed)) {
                    return true;
                }
            }
            taken[seed] = false;
            return false;
        }

        private boolean grow(int[] region, int count, int digitMask, boolean[] banned, int size, int seed) {
            if (count == size) {
                return !hasStrandedCell() && partition();
            }
            int[] frontier = frontier(region, count, digitMask, banned);
            int length = frontier.length;
            Randoms.shuffle(frontier, length, rng);
            for (int i = 0; i < length; i++) {
                int cell = frontier[i];
                int checkpoint = unionFind.checkpoint();
                taken[cell] = true;
                unionFind.union(seed, cell);
                region[count] = cell;
                if (grow(region, count + 1, digitMask | (1 << (digits[cell] - 1)), banned, size, seed)) {
                    return true;
                }
                taken[cell] = false;
                unionFind.rollback(checkpoint);
                banned[cell] = true;
            }
            for (int i = 0; i < length; i++) {
                banned[frontier[i]] = false;
            }
            return false;
        }

        private int[] frontier(int[] region, int count, int digitMask, boolean[] banned) {
            int[] buffer = new int[count * DIRECTIONS.length];
            int n = 0;
            for (int i = 0; i < count; i++) {
                int row = region[i] / SIZE;
                int col = region[i] % SIZE;
                for (int[] dir : DIRECTIONS) {
                    int r = row + dir[0];
                    int c = col + dir[1];
                    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
                        continue;
                    }
                    int neighbor = r * SIZE + c;
                    if (taken[neighbor] || banned[neighbor] || (digitMask & (1 << (digits[neighbor] - 1))) != 0) {
                        continue;
                    }
                    boolean duplicate = false;
                    for (int j = 0; j < n; j++) {
                        if (buffer[j] == neighbor) {
                            duplicate = true;
                            break;
                        }
                    }
                    if (!duplicate) {
                        buffer[n++] = neighbor;
                    }
                }
            }
            return Arrays.copyOf(buffer, n);
        }

        private int pickSeed() {
            int seed = -1;
            int bestFree = Integer.MAX_VALUE;
            int ties = 0;
            for (int idx = 0; idx < CELL_COUNT; idx++) {
                if (taken[idx]) {
                    continue;
                }
                int free = freeNeighbors(idx);
                if (free < bestFree) {
                    bestFree = free;
                    seed = idx;
                    ties = 1;
                } else if (free == bestFree && rng.nextInt(++ties) == 0) {
                    seed = idx;
                }
            }
            return seed;
        }

        private int freeNeighbors(int idx) {
            int row = idx / SIZE;
            int col = idx % SIZE;
            int free = 0;
            for (int[] dir : DIRECTIONS) {
                int r = row + dir[0];
                int c = col + dir[1];
                if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && !taken[r * SIZE + c]) {
                    free++;
                }
            }
            return free;
        }

        private boolean hasStrandedCell() {
            for (int idx = 0; idx < CELL_COUNT; idx++) {
                if (!taken[idx] && freeNeighbors(idx) == 0) {
                    return true;
                }
            }
            return false;
        }

        private int[] sizeOrder() {
            int[] remaining = weights.clone();
            int[] order = new int[remaining.length];
            for (int i = 0; i < order.length; i++) {
                int index = Randoms.weightedIndex(remaining, rng);
                order[i] = MIN_CAGE_SIZE + index;
                remaining[index] = 0;
            }
            return order;
        }
    }
}
