package com.killer.sudoku.server.protocol;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.SolverStrategyType;

public record StartGameRequest(
        GameMode mode, Difficulty difficulty, String seed, String playerName, SolverStrategyType solverStrategy) {
}
