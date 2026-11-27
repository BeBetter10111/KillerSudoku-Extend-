package com.killer.sudoku.server.protocol;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.SolverStrategyType;

/**
 * Starts a new game, or (with {@code resume}) continues the player's saved game; mode, difficulty and seed are then
 * taken from the save. {@code authToken} is the bearer token returned by the login endpoints.
 */
public record StartGameRequest(
        GameMode mode,
        Difficulty difficulty,
        String seed,
        String playerName,
        SolverStrategyType solverStrategy,
        String authToken,
        Boolean resume) {

    public StartGameRequest(
            GameMode mode, Difficulty difficulty, String seed, String playerName, SolverStrategyType solverStrategy) {
        this(mode, difficulty, seed, playerName, solverStrategy, null, null);
    }
}
