package com.killer.sudoku.algorithm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

class BacktrackingCageGeneratorTest {

    private static final String SOLUTION =
            "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

    private final SudokuSolver solver = SolverFactory.forStrategy(SolverStrategyType.OPTIMIZED_MRV_PRUNING);
    private final BacktrackingCageGenerator generator = new BacktrackingCageGenerator();

    @Test
    void producesValidPartitionForEveryDifficulty() {
        int[][] solution = SudokuSolverTest.parse(SOLUTION);
        for (Difficulty difficulty : Difficulty.values()) {
            for (int seed = 0; seed < 20; seed++) {
                assertValidPartition(solution, generator.generateCages(solution, difficulty, new Random(seed)));
            }
        }
    }

    @Test
    void isDeterministicForSameSeed() {
        int[][] solution = SudokuSolverTest.parse(SOLUTION);
        assertEquals(
                generator.generateCages(solution, Difficulty.MEDIUM, new Random(42)),
                generator.generateCages(solution, Difficulty.MEDIUM, new Random(42)));
    }

    @Test
    void harderDifficultyYieldsFewerLargerCages() {
        int[][] solution = SudokuSolverTest.parse(SOLUTION);
        int easy = 0;
        int hard = 0;
        for (int seed = 0; seed < 30; seed++) {
            easy += generator.generateCages(solution, Difficulty.EASY, new Random(seed)).size();
            hard += generator.generateCages(solution, Difficulty.HARD, new Random(seed)).size();
        }
        assertTrue(easy > hard);
    }

    @Test
    void reshapeKeepsValuesAndPreservesUniqueSolution() {
        PuzzleGenerator puzzleGenerator = new PuzzleGenerator(generator);
        Board board = puzzleGenerator.generate(Difficulty.HARD, "reshape-test");
        List<Position> empty = board.getEmptyCells();
        for (int i = 0; i < empty.size() / 2; i++) {
            Cell cell = board.getCell(empty.get(i));
            cell.place(cell.getSolutionValue());
        }
        int[][] valuesBefore = currentValues(board);
        int[][] known = new int[9][9];
        int[][] solution = new int[9][9];
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                solution[row][col] = board.getCell(row, col).getSolutionValue();
                known[row][col] = board.getCell(row, col).isSolved() ? solution[row][col] : 0;
            }
        }

        List<Cage> reshaped = generator.reshapeCages(board, new Random(5));

        assertValidPartition(solution, reshaped);
        assertTrue(solver.hasUniqueSolution(known, reshaped));
        board.replaceCages(reshaped);
        assertEquals(valuesBefore.length, currentValues(board).length);
        assertTrue(java.util.Arrays.deepEquals(valuesBefore, currentValues(board)));
    }

    private static int[][] currentValues(Board board) {
        int[][] values = new int[9][9];
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                values[row][col] = board.getCell(row, col).getCurrentValue();
            }
        }
        return values;
    }

    static void assertValidPartition(int[][] solution, List<Cage> cages) {
        Set<Position> covered = new HashSet<>();
        for (Cage cage : cages) {
            assertTrue(cage.size() >= 2 && cage.size() <= 5, "cage size " + cage.size());
            Set<Integer> digits = new HashSet<>();
            int sum = 0;
            for (Position position : cage.cells()) {
                assertTrue(covered.add(position), "cell covered twice: " + position);
                assertTrue(digits.add(solution[position.row()][position.col()]), "duplicate digit in cage");
                sum += solution[position.row()][position.col()];
            }
            assertEquals(sum, cage.targetSum());
            assertTrue(isConnected(cage), "cage not connected");
        }
        assertEquals(81, covered.size());
    }

    private static boolean isConnected(Cage cage) {
        Set<Position> members = new HashSet<>(cage.cells());
        Set<Position> seen = new HashSet<>();
        Deque<Position> queue = new ArrayDeque<>();
        queue.add(cage.cells().get(0));
        seen.add(cage.cells().get(0));
        while (!queue.isEmpty()) {
            Position p = queue.poll();
            int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
            for (int[] d : dirs) {
                int r = p.row() + d[0];
                int c = p.col() + d[1];
                if (r < 0 || r > 8 || c < 0 || c > 8) {
                    continue;
                }
                Position next = new Position(r, c);
                if (members.contains(next) && seen.add(next)) {
                    queue.add(next);
                }
            }
        }
        return seen.size() == members.size();
    }

    @Test
    void generationMetricsCountUnionFindOperations() {
        int[][] solution = SudokuSolverTest.parse(SOLUTION);
        CageLayoutResult result = generator.generateCagesWithMetrics(
                solution, Difficulty.MEDIUM, SolverStrategyType.OPTIMIZED_MRV_PRUNING, new Random(1));
        assertValidPartition(solution, result.cages());
        assertTrue(result.metrics().unionFindOps() >= 81);
        assertEquals(0, result.metrics().nodesVisited());
        assertEquals(0, result.metrics().prunedBranches());
        assertEquals(AlgorithmMetrics.PUZZLE_GEN, result.metrics().operationType());

        CageLayoutResult again = generator.generateCagesWithMetrics(
                solution, Difficulty.MEDIUM, SolverStrategyType.OPTIMIZED_MRV_PRUNING, new Random(1));
        assertEquals(result.metrics().unionFindOps(), again.metrics().unionFindOps());
        assertEquals(result.cages(), again.cages());
    }

    @Test
    void reshapeWithEveryStrategyIsOracleVerifiedAndUnique() {
        PuzzleGenerator puzzleGenerator = new PuzzleGenerator(generator);
        for (SolverStrategyType strategy : SolverStrategyType.values()) {
            Board board = puzzleGenerator.generate(Difficulty.HARD, "reshape-metrics-" + strategy);
            List<Position> empty = board.getEmptyCells();
            for (int i = 0; i < empty.size() / 2; i++) {
                Cell cell = board.getCell(empty.get(i));
                cell.place(cell.getSolutionValue());
            }
            int[][] solution = new int[9][9];
            int[][] known = new int[9][9];
            for (int r = 0; r < 9; r++) {
                for (int c = 0; c < 9; c++) {
                    solution[r][c] = board.getCell(r, c).getSolutionValue();
                    known[r][c] = board.getCell(r, c).isSolved() ? solution[r][c] : 0;
                }
            }

            CageLayoutResult result = generator.reshapeCages(board, strategy, new Random(8));

            assertValidPartition(solution, result.cages());
            assertTrue(solver.hasUniqueSolution(known, result.cages()));
            AlgorithmMetrics metrics = result.metrics();
            assertEquals(strategy, metrics.strategyUsed());
            assertEquals(AlgorithmMetrics.CAGE_RESHAPE, metrics.operationType());
            assertTrue(metrics.oracleVerified());
            assertTrue(metrics.unionFindOps() > 0);
            assertTrue(metrics.nodesVisited() > 0);
            assertTrue(metrics.executionTimeMs() > 0);
        }
    }

    @Test
    void twoArgumentReshapeStaysBackwardCompatible() {
        Board board = new PuzzleGenerator(generator).generate(Difficulty.HARD, "reshape-compat");
        List<Cage> cages = generator.reshapeCages(board, new Random(2));
        assertEquals(81, cages.stream().mapToInt(Cage::size).sum());
    }
}
