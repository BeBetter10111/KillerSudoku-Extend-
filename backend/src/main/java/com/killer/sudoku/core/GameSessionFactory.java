package com.killer.sudoku.core;

import java.com.killer.sudoku.algorithm.GeneratedPuzzle;
import com.killer.sudoku.algorithm.PuzzleGenerator;
import com.killer.sudoku.config.DifficultyConfig;
import com.killer.sudoku.config.GameBalanceConfig;
import com.killer.sudoku.model.Board;
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
        Board board = puzzle.board();
        PlayerHealth health = new PlayerHealth(GameBalanceConfig.forBotChallenge(difficulty).maxHp());
        Random modifierRng = new Random(("modifiers:" + seed).hashCode());
        List<GameModifier> modifiers = difficultyConfig.createModifiers(mode, difficulty, modifierRng, solverStrategy);
        return new GameSession(sessionId, mode, difficulty, solverStrategy, seed, playerName, board, health,
                new TimerService(), modifiers, puzzle.metrics());
    }
}
