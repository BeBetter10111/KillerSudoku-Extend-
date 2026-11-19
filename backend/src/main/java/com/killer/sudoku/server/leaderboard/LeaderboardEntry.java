package com.killer.sudoku.server.leaderboard;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import java.time.Instant;
import java.time.LocalDate;

public record LeaderboardEntry(
        String playerName,
        long finalTimeMs,
        GameMode mode,
        Difficulty difficulty,
        LocalDate date,
        Instant completedAt) {
}
