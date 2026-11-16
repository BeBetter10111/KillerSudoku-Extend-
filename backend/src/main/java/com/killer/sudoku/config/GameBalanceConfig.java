package com.killer.sudoku.config;

import com.killer.sudoku.model.Difficulty;

public record GameBalanceConfig(
        int maxHp,
        long initialBotTimeoutMs,
        int hpPenalty,
        double timeoutDecay,
        long minBotTimeoutMs,
        long reshapeIntervalMs,
        long preReshapeAlertMs) {

    private static final long MIN_BOT_TIMEOUT_MS = 5_000;
    private static final double TIMEOUT_DECAY = 0.10;
    private static final long NO_RESHAPE = 0;

    public GameBalanceConfig {
        if (maxHp <= 0 || hpPenalty <= 0 || initialBotTimeoutMs <= 0 || minBotTimeoutMs <= 0) {
            throw new IllegalArgumentException("HP, penalty and timeouts must be positive");
        }
        if (minBotTimeoutMs > initialBotTimeoutMs) {
            throw new IllegalArgumentException("minBotTimeoutMs must not exceed initialBotTimeoutMs");
        }
        if (timeoutDecay < 0 || timeoutDecay >= 1) {
            throw new IllegalArgumentException("timeoutDecay must be in [0, 1): " + timeoutDecay);
        }
        if (reshapeIntervalMs < 0 || preReshapeAlertMs < 0) {
            throw new IllegalArgumentException("Reshape timings must not be negative");
        }
        if (reshapeIntervalMs > 0 && preReshapeAlertMs >= reshapeIntervalMs) {
            throw new IllegalArgumentException("preReshapeAlertMs must be shorter than reshapeIntervalMs");
        }
    }

    public static GameBalanceConfig forBotChallenge(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> new GameBalanceConfig(100, 45_000, 15, TIMEOUT_DECAY, MIN_BOT_TIMEOUT_MS, NO_RESHAPE, NO_RESHAPE);
            case MEDIUM -> new GameBalanceConfig(100, 30_000, 25, TIMEOUT_DECAY, MIN_BOT_TIMEOUT_MS, NO_RESHAPE, NO_RESHAPE);
            case HARD -> new GameBalanceConfig(100, 25_000, 30, TIMEOUT_DECAY, MIN_BOT_TIMEOUT_MS, 300_000, 10_000);
        };
    }

    public boolean hasReshape() {
        return reshapeIntervalMs > 0;
    }
}
