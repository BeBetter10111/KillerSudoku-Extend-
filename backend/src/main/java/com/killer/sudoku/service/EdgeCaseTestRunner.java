package com.killer.sudoku.service;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.CageLayoutResult;
import com.killer.sudoku.algorithm.GridVerifier;
import com.killer.sudoku.algorithm.NaiveBacktrackingSolver;
import com.killer.sudoku.algorithm.OptimizedBacktrackingSolver;
import com.killer.sudoku.algorithm.PuzzleGenerator;
import com.killer.sudoku.algorithm.SudokuSolver;
import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.core.GameSessionFactory;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.function.Function;

public class EdgeCaseTestRunner {

    static final long ORACLE_BUDGET = 1_000_000;
    static final long ZERO_GIVEN_NAIVE_BUDGET = 300_000;
    static final long ZERO_GIVEN_OPTIMIZED_BUDGET = 3_000_000;
    static final String ZERO_GIVEN_SEED = "edge-case-zero-given";

    private static final int SIZE = Board.SIZE;
    private static final String CLASSIC_PUZZLE =
            "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
    private static final String CLASSIC_SOLUTION =
            "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

    private final PuzzleGenerator puzzleGenerator;
    private final BacktrackingCageGenerator cageGenerator;
    private final GameSessionFactory sessionFactory;
    private final Clock clock;

    public record EdgeCaseResult(
            int id,
            String name,
            String description,
            boolean passed,
            double millis,
            long nodes,
            String detail) {
    }

    public record EdgeCaseReport(
            int total,
            int passed,
            boolean allPassed,
            List<EdgeCaseResult> results,
            long timestampMs) {
    }

    public EdgeCaseTestRunner(
            PuzzleGenerator puzzleGenerator,
            BacktrackingCageGenerator cageGenerator,
            GameSessionFactory sessionFactory,
            Clock clock) {
        this.puzzleGenerator = puzzleGenerator;
        this.cageGenerator = cageGenerator;
        this.sessionFactory = sessionFactory;
        this.clock = clock;
    }

    public EdgeCaseReport run() {
        List<EdgeCaseResult> results = new ArrayList<>();
        results.add(execute(1, "Impossible Cage Sum",
                "A 2-cell cage can only sum to 3..17; targets 18 and 2 must have no solution, 17 must stay solvable.",
                this::impossibleCageSum));
        results.add(execute(2, "Duplicate Digit Violation inside a Cage",
                "Two equal givens inside one cage are contradictory, and the board rejects a cage that repeats a digit.",
                this::duplicateDigitInCage));
        results.add(execute(3, "Ambiguous Puzzle with Multiple Solutions",
                "An under-constrained killer puzzle must report hasUniqueSolution = false; a classic puzzle must stay unique.",
                this::ambiguousPuzzle));
        results.add(execute(4, "Pure 0-Given Killer Sudoku",
                "With no givens, the puzzle is solved from the cage sums and the Sudoku rules alone.",
                this::pureZeroGiven));
        results.add(execute(5, "Near-Full Board Reshape Boundary",
                "The bot stays active with 2 empty cells, deactivates below 2, and a cage reshape on a near-full board stays valid.",
                this::nearFullBoard));
        results.add(execute(6, "Deterministic Seed Replay Consistency",
                "Two sessions with the same seed and the same moves produce an identical state transcript.",
                this::deterministicReplay));
        int passed = (int) results.stream().filter(EdgeCaseResult::passed).count();
        return new EdgeCaseReport(results.size(), passed, passed == results.size(), List.copyOf(results), clock.millis());
    }

    private interface Check {
        Outcome run(long[] nodes);
    }

    private record Outcome(boolean passed, String detail) {
    }

    private EdgeCaseResult execute(int id, String name, String description, Check check) {
        long[] nodes = {0};
        long started = System.nanoTime();
        Outcome outcome;
        try {
            outcome = check.run(nodes);
        } catch (RuntimeException e) {
            outcome = new Outcome(false, "Unexpected " + e.getClass().getSimpleName() + ": " + e.getMessage());
        }
        double millis = (System.nanoTime() - started) / 1_000_000.0;
        return new EdgeCaseResult(id, name, description, outcome.passed(), millis, nodes[0], outcome.detail());
    }

    private Outcome impossibleCageSum(long[] nodes) {
        SudokuSolver optimized = new OptimizedBacktrackingSolver();
        SudokuSolver naive = new NaiveBacktrackingSolver(ORACLE_BUDGET);
        int[][] empty = new int[SIZE][SIZE];
        StringBuilder detail = new StringBuilder();
        boolean passed = true;
        for (int target : new int[] {18, 2}) {
            List<Cage> cages = List.of(twoCellCage(target));
            SudokuSolver.SolveResult fast = optimized.solve(empty, cages);
            SudokuSolver.SolveResult oracle = naive.solve(empty, cages);
            nodes[0] += fast.metrics().nodesVisited() + oracle.metrics().nodesVisited();
            boolean rejected = !fast.solved() && !oracle.solved() && fast.metrics().nodesVisited() == 0;
            passed &= rejected;
            detail.append("target ").append(target).append(": ").append(rejected ? "rejected" : "NOT rejected")
                    .append(" (optimized ").append(fast.metrics().nodesVisited()).append(" nodes, naive ")
                    .append(oracle.metrics().nodesVisited()).append("); ");
        }
        List<Cage> control = List.of(twoCellCage(17));
        SudokuSolver.SolveResult fast = optimized.solve(empty, control);
        SudokuSolver.SolveResult oracle = naive.solve(empty, control);
        nodes[0] += fast.metrics().nodesVisited() + oracle.metrics().nodesVisited();
        boolean controlOk = fast.solved() && oracle.solved()
                && GridVerifier.isValidSolution(fast.solution(), empty, control)
                && GridVerifier.isValidSolution(oracle.solution(), empty, control);
        passed &= controlOk;
        detail.append("control target 17: ").append(controlOk ? "solved by both" : "FAILED");
        return new Outcome(passed, detail.toString());
    }

    private Outcome duplicateDigitInCage(long[] nodes) {
        Cage cage = new Cage(0, List.of(new Position(0, 2), new Position(1, 3)), 8);
        int[][] givens = new int[SIZE][SIZE];
        givens[0][2] = 4;
        givens[1][3] = 4;
        SudokuSolver.SolveResult fast = new OptimizedBacktrackingSolver().solve(givens, List.of(cage));
        SudokuSolver.SolveResult oracle = new NaiveBacktrackingSolver(ORACLE_BUDGET).solve(givens, List.of(cage));
        nodes[0] += fast.metrics().nodesVisited() + oracle.metrics().nodesVisited();
        boolean solversReject = !fast.solved() && !oracle.solved();

        Board board = puzzleGenerator.generate(Difficulty.EASY, "edge-case-duplicate");
        List<Cage> original = board.getCages();
        List<Cage> corrupted = corruptWithDuplicate(board);
        String boardDetail;
        boolean boardRejects = false;
        if (corrupted == null) {
            boardDetail = "could not build a duplicate-digit layout";
        } else {
            try {
                board.replaceCages(corrupted);
                boardDetail = "board accepted a cage that repeats a digit";
            } catch (IllegalArgumentException e) {
                boardRejects = board.getCages().equals(original);
                boardDetail = boardRejects ? "board rejected it atomically (" + e.getMessage() + ")"
                        : "board rejected it but changed its cages";
            }
        }
        String detail = "conflicting givens: " + (solversReject ? "both solvers report no solution" : "NOT rejected")
                + "; " + boardDetail;
        return new Outcome(solversReject && boardRejects, detail);
    }

    private static List<Cage> corruptWithDuplicate(Board board) {
        List<Cage> cages = new ArrayList<>(board.getCages());
        for (int x = 0; x < cages.size(); x++) {
            Cage first = cages.get(x);
            Set<Integer> digits = new HashSet<>();
            for (Position p : first.cells()) {
                digits.add(board.getCell(p).getSolutionValue());
            }
            for (int y = 0; y < cages.size(); y++) {
                Cage second = cages.get(y);
                if (x == y || second.size() < 2) {
                    continue;
                }
                for (Position moved : second.cells()) {
                    int digit = board.getCell(moved).getSolutionValue();
                    if (!digits.contains(digit)) {
                        continue;
                    }
                    List<Position> grown = new ArrayList<>(first.cells());
                    grown.add(moved);
                    List<Position> shrunk = new ArrayList<>(second.cells());
                    shrunk.remove(moved);
                    cages.set(x, new Cage(first.id(), grown, first.targetSum() + digit));
                    cages.set(y, new Cage(second.id(), shrunk, second.targetSum() - digit));
                    return cages;
                }
            }
        }
        return null;
    }

    private Outcome ambiguousPuzzle(long[] nodes) {
        int[][] solution = parse(CLASSIC_SOLUTION);
        List<Cage> cages = rowTripleCages(solution);
        int[][] oneGiven = new int[SIZE][SIZE];
        oneGiven[0][0] = solution[0][0];
        StringBuilder detail = new StringBuilder();
        boolean passed = true;
        for (SudokuSolver solver : List.of(new OptimizedBacktrackingSolver(), new NaiveBacktrackingSolver(ORACLE_BUDGET))) {
            SudokuSolver.CountResult ambiguous = solver.countSolutions(oneGiven, cages, 2);
            SudokuSolver.CountResult unique = solver.countSolutions(parse(CLASSIC_PUZZLE), List.of(), 2);
            nodes[0] += ambiguous.metrics().nodesVisited() + unique.metrics().nodesVisited();
            boolean ok = !solver.hasUniqueSolution(oneGiven, cages) && ambiguous.solutionsFound() == 2
                    && ambiguous.completed() && unique.unique();
            passed &= ok;
            detail.append(solver.strategy()).append(": ambiguous puzzle -> ").append(ambiguous.solutionsFound())
                    .append(" solutions found, classic control unique=").append(unique.unique()).append("; ");
        }
        return new Outcome(passed, detail.toString().trim());
    }

    private Outcome pureZeroGiven(long[] nodes) {
        Random rng = new Random(ZERO_GIVEN_SEED.hashCode());
        int[][] solution = new OptimizedBacktrackingSolver().solve(new int[SIZE][SIZE], List.of(), rng).solution();
        List<Cage> cages = cageGenerator.generateCages(solution, Difficulty.EASY, rng);
        int[][] empty = new int[SIZE][SIZE];
        SudokuSolver.SolveResult fast = new OptimizedBacktrackingSolver(ZERO_GIVEN_OPTIMIZED_BUDGET).solve(empty, cages);
        SudokuSolver.SolveResult oracle = new NaiveBacktrackingSolver(ZERO_GIVEN_NAIVE_BUDGET).solve(empty, cages);
        nodes[0] += fast.metrics().nodesVisited() + oracle.metrics().nodesVisited();
        String violation = fast.solved() ? GridVerifier.firstViolation(fast.solution(), empty, cages) : "no solution found";
        boolean passed = fast.solved() && violation == null;
        String naiveNote = oracle.solved()
                ? "naive oracle also solved it in " + oracle.metrics().nodesVisited() + " nodes"
                : "naive oracle gave up after " + oracle.metrics().nodesVisited() + " nodes";
        String detail = passed
                ? cages.size() + " cages, 0 givens: optimized solved it in " + fast.metrics().nodesVisited()
                        + " nodes and every cage sum checks out; " + naiveNote
                : "optimized solver failed: " + violation;
        return new Outcome(passed, detail);
    }

    private Outcome nearFullBoard(long[] nodes) {
        GameSession session = sessionFactory.create(
                "edge-near-full", GameMode.BOT_CHALLENGE, Difficulty.HARD, SolverStrategyType.OPTIMIZED_MRV_PRUNING,
                "edge-case-near-full", null);
        session.getLatestMetrics().ifPresent(metrics -> nodes[0] += metrics.nodesVisited());
        session.start();
        Board board = session.getBoard();
        List<Position> empty = board.getEmptyCells();
        boolean botActiveAtTwo = false;
        boolean botInactiveAtOne = false;
        for (int i = 0; i < empty.size() - 1; i++) {
            Position position = empty.get(i);
            session.submitValue(position, board.getCell(position).getSolutionValue());
            int remaining = board.getEmptyCellsCount();
            if (remaining == 2) {
                botActiveAtTwo = session.getBot().map(bot -> bot.isActive()).orElse(false);
            } else if (remaining == 1) {
                botInactiveAtOne = session.getBot().map(bot -> !bot.isActive()).orElse(false);
            }
        }
        int[][] solution = new int[SIZE][SIZE];
        int[][] known = new int[SIZE][SIZE];
        for (int row = 0; row < SIZE; row++) {
            for (int col = 0; col < SIZE; col++) {
                Cell cell = board.getCell(row, col);
                solution[row][col] = cell.getSolutionValue();
                known[row][col] = cell.isSolved() ? cell.getSolutionValue() : Cell.EMPTY;
            }
        }
        CageLayoutResult reshaped = cageGenerator.reshapeCages(board, SolverStrategyType.OPTIMIZED_MRV_PRUNING, new Random(7));
        AlgorithmMetrics metrics = reshaped.metrics();
        nodes[0] += metrics.nodesVisited();
        int covered = reshaped.cages().stream().mapToInt(Cage::size).sum();
        boolean valid = GridVerifier.firstViolation(solution, null, reshaped.cages()) == null && covered == SIZE * SIZE;
        boolean unique = new OptimizedBacktrackingSolver().hasUniqueSolution(known, reshaped.cages());
        boolean passed = botActiveAtTwo && botInactiveAtOne && valid && unique && board.getEmptyCellsCount() == 1;
        String detail = "bot active at 2 empty cells: " + botActiveAtTwo + ", deactivated at 1: " + botInactiveAtOne
                + "; reshape with 1 empty cell -> " + reshaped.cages().size() + " cages, valid partition: " + valid
                + ", unique solution: " + unique + ", oracle verified: " + metrics.oracleVerified();
        return new Outcome(passed, detail);
    }

    private Outcome deterministicReplay(long[] nodes) {
        String seed = "edge-case-replay";
        Function<String, GameSession> create = id -> sessionFactory.create(
                id, GameMode.BOT_CHALLENGE, Difficulty.MEDIUM, SolverStrategyType.OPTIMIZED_MRV_PRUNING, seed, null);
        GameSession first = create.apply("edge-replay-a");
        GameSession second = create.apply("edge-replay-b");
        GameSession other = sessionFactory.create("edge-replay-c", GameMode.BOT_CHALLENGE, Difficulty.MEDIUM,
                SolverStrategyType.OPTIMIZED_MRV_PRUNING, seed + "-different", null);
        for (GameSession session : List.of(first, second)) {
            session.getLatestMetrics().ifPresent(metrics -> nodes[0] += metrics.nodesVisited());
        }
        String transcriptA = play(first);
        String transcriptB = play(second);
        boolean sameTranscript = transcriptA.equals(transcriptB);
        boolean sameBoard = first.getBoard().getCages().equals(second.getBoard().getCages())
                && Arrays.deepEquals(values(first.getBoard()), values(second.getBoard()));
        boolean sameLog = first.getReplayLog().equals(second.getReplayLog())
                && first.isWon() == second.isWon() && first.getFinalTimeMs() == second.getFinalTimeMs();
        boolean differentSeedDiffers = !other.getBoard().getCages().equals(first.getBoard().getCages());
        String detail = first.getReplayLog().size() + " moves replayed: transcripts identical=" + sameTranscript
                + ", final board identical=" + sameBoard + ", replay log and result identical=" + sameLog
                + ", a different seed differs=" + differentSeedDiffers;
        return new Outcome(sameTranscript && sameBoard && sameLog && differentSeedDiffers && first.isWon(), detail);
    }

    private static String play(GameSession session) {
        session.start();
        StringBuilder transcript = new StringBuilder();
        Board board = session.getBoard();
        List<Position> empty = board.getEmptyCells();
        for (int i = 0; i < empty.size(); i++) {
            Position position = empty.get(i);
            int solution = board.getCell(position).getSolutionValue();
            if (i % 15 == 3) {
                session.submitValue(position, solution % SIZE + 1);
            }
            session.tick(1_000);
            session.submitValue(position, solution);
            transcript.append(snapshot(session)).append('\n');
        }
        return transcript.toString();
    }

    private static String snapshot(GameSession session) {
        String bot = session.getBot()
                .map(b -> b.isActive() + "/" + b.isRevealed() + "/" + b.getPosition() + "/" + b.getRemainingTimeoutMs())
                .orElse("none");
        return session.getPlayerHealth().getCurrentHp() + "|" + session.getElapsedMs() + "|" + session.getPenaltyMs()
                + "|" + session.getBoard().getEmptyCellsCount() + "|" + bot + "|" + session.isFinished();
    }

    private static int[][] values(Board board) {
        int[][] grid = new int[SIZE][SIZE];
        for (int row = 0; row < SIZE; row++) {
            for (int col = 0; col < SIZE; col++) {
                grid[row][col] = board.getCell(row, col).getCurrentValue();
            }
        }
        return grid;
    }

    private static Cage twoCellCage(int target) {
        return new Cage(0, List.of(new Position(0, 0), new Position(0, 1)), target);
    }

    private static int[][] parse(String digits) {
        int[][] grid = new int[SIZE][SIZE];
        for (int i = 0; i < SIZE * SIZE; i++) {
            grid[i / SIZE][i % SIZE] = digits.charAt(i) - '0';
        }
        return grid;
    }

    private static List<Cage> rowTripleCages(int[][] solution) {
        List<Cage> cages = new ArrayList<>();
        int id = 0;
        for (int row = 0; row < SIZE; row++) {
            for (int start = 0; start < SIZE; start += 3) {
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
