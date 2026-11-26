package com.killer.sudoku.core;

import com.killer.sudoku.algorithm.GeneratedPuzzle;
import com.killer.sudoku.algorithm.PuzzleGenerator;
import com.killer.sudoku.config.DifficultyConfig;
import com.killer.sudoku.config.GameBalanceConfig;
import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.PlayerHealth;
import com.killer.sudoku.model.SolverStrategyType;
import com.killer.sudoku.modifier.GameModifier;
import com.killer.sudoku.service.TimerService;
import java.util.List;
import java.util.Random;

public final class GameSessionFactory {

    private final PuzzleGenerator puzzleGenerator;
    private final DifficultyConfig difficultyConfig;

    public GameSessionFactory(PuzzleGenerator puzzleGenerator, DifficultyConfig difficultyConfig) {
        this.puzzleGenerator = puzzleGenerator;
        this.difficultyConfig = difficultyConfig;
    }

    public GameSession create(String sessionId, GameMode mode, Difficulty difficulty, String seed, String playerName) {
        return create(sessionId, mode, difficulty, SolverStrategyType.OPTIMIZED_MRV_PRUNING, seed, playerName);
    }

    public GameSession create(
            String sessionId,
            GameMode mode,
            Difficulty difficulty,
            SolverStrategyType solverStrategy,
            String seed,
            String playerName) {
        GeneratedPuzzle puzzle = puzzleGenerator.generateWithMetrics(difficulty, seed, solverStrategy);
        Board board = difficulty == Difficulty.HARD ? hardBoard(puzzle.board(), seed) : puzzle.board();
        PlayerHealth health = new PlayerHealth(GameBalanceConfig.startingHp(mode, difficulty));
        Random modifierRng = new Random(("modifiers:" + seed).hashCode());
        List<GameModifier> modifiers = difficultyConfig.createModifiers(mode, difficulty, modifierRng, solverStrategy);
        return new GameSession(sessionId, mode, difficulty, solverStrategy, seed, playerName, board, health,
                new TimerService(), modifiers, puzzle.metrics());
    }

    private static Board hardBoard(Board board, String seed) {
        Cell[][] cells = new Cell[Board.SIZE][Board.SIZE];
        int[][] solution = new int[Board.SIZE][Board.SIZE];
        for (int row = 0; row < Board.SIZE; row++) {
            for (int col = 0; col < Board.SIZE; col++) {
                solution[row][col] = board.getCell(row, col).getSolutionValue();
                cells[row][col] = new Cell(row, col, solution[row][col], false);
            }
        }
        List<Cage> cages = BacktrackingCageGenerator.withSingleCellCages(
                board.getCages(), solution, new Random(("singles:" + seed).hashCode()));
        return new Board(cells, cages);
    }
}
