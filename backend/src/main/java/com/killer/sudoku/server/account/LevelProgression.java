package com.killer.sudoku.server.account;

import com.killer.sudoku.model.Difficulty;

/** Medium needs 3 Easy plays, Hard needs 5 Medium plays. */
public final class LevelProgression {

    private LevelProgression() {
    }

    public static Difficulty previous(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> null;
            case MEDIUM -> Difficulty.EASY;
            case HARD -> Difficulty.MEDIUM;
        };
    }

    public static int requiredPlays(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY -> 0;
            case MEDIUM -> 3;
            case HARD -> 5;
        };
    }

    public static boolean isUnlocked(Difficulty difficulty, int playsOfPreviousLevel) {
        return previous(difficulty) == null || playsOfPreviousLevel >= requiredPlays(difficulty);
    }
}
