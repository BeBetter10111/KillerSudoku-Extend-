package com.killer.sudoku.config;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;

public record GameBalanceConfig(
        int maxHp,
        long initialBotTimeoutMs,
        int hpPenalty,
        double timeoutDecay,
        long minBotTimeoutMs,
        long reshapeIntervalMs,
        long preReshapeAlertMs,
        int wrongAnswerHpPenalty) {

    public static final int CLASSIC_LIVES = 3;
    public static final int CLASSIC_WRONG_ANSWER_PENALTY = 1;

    private static final long BOT_TIMEOUT_MS = 45_000;
    private static final long MIN_BOT_TIMEOUT_MS = 5_000;
    private static final double TIMEOUT_DECAY = 0.10;
    private static final long NO_RESHAPE = 0;

    public GameBalanceConfig {
        if (maxHp <= 0 || hpPenalty <= 0 || wrongAnswerHpPenalty <= 0 || initialBotTimeoutMs <= 0 || minBotTimeoutMs <= 0) {
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

    public GameBalanceConfig(
            int maxHp,
            long initialBotTimeoutMs,
            int hpPenalty,
            double timeoutDecay,
            int minBotTimeoutMs,
            int reshapeIntervalMs,
            int preReshapeAlertMs) {
        this(maxHp, initialBotTimeoutMs, hpPenalty, timeoutDecay, minBotTimeoutMs,
                reshapeIntervalMs, preReshapeAlertMs, 10);
    }

    public static GameBalanceConfig forBotChallenge(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> new GameBalanceConfig(
                    100, BOT_TIMEOUT_MS, 15, TIMEOUT_DECAY, MIN_BOT_TIMEOUT_MS, NO_RESHAPE, NO_RESHAPE, 10);
            case MEDIUM -> new GameBalanceConfig(
                    100, 30_000, 25, TIMEOUT_DECAY, MIN_BOT_TIMEOUT_MS, NO_RESHAPE, NO_RESHAPE, 10);
            case HARD -> new GameBalanceConfig(
                    100, 25_000, 30, TIMEOUT_DECAY, MIN_BOT_TIMEOUT_MS, 300_000, 10_000, 10);
        };
    }

    public static int startingHp(GameMode mode, Difficulty difficulty) {
        return 100;
    }

    public static int wrongAnswerPenalty(GameMode mode, Difficulty difficulty) {
        return mode == GameMode.CLASSIC
                ? CLASSIC_WRONG_ANSWER_PENALTY
                : forBotChallenge(difficulty).wrongAnswerHpPenalty();
    }

    public GameBalanceConfig withReshapeInterval(long intervalMs) {
        if (intervalMs <= 0) {
            throw new IllegalArgumentException("Reshape interval must be positive: " + intervalMs);
        }
        long alertMs = Math.min(preReshapeAlertMs, Math.max(1, intervalMs / 3));
        return new GameBalanceConfig(maxHp, initialBotTimeoutMs, hpPenalty, timeoutDecay, minBotTimeoutMs,
                intervalMs, alertMs, wrongAnswerHpPenalty);
    }

    public boolean hasReshape() {
        return reshapeIntervalMs > 0;
    }
}
