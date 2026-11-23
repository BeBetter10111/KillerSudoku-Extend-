package com.killer.sudoku.config;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.WeightedRandomBotStrategy;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.SolverStrategyType;
import com.killer.sudoku.modifier.BotModifier;
import com.killer.sudoku.modifier.CageReshapeModifier;
import com.killer.sudoku.modifier.GameModifier;
import java.util.List;
import java.util.Random;

public final class DifficultyConfig {

    private final WeightedRandomBotStrategy botStrategy;
    private final BacktrackingCageGenerator cageGenerator;
    private final long reshapeIntervalOverrideMs;

    public DifficultyConfig(WeightedRandomBotStrategy botStrategy, BacktrackingCageGenerator cageGenerator) {
        this(botStrategy, cageGenerator, 0);
    }

    public DifficultyConfig(
            WeightedRandomBotStrategy botStrategy, BacktrackingCageGenerator cageGenerator, long reshapeIntervalOverrideMs) {
        this.botStrategy = botStrategy;
        this.cageGenerator = cageGenerator;
        this.reshapeIntervalOverrideMs = Math.max(0, reshapeIntervalOverrideMs);
    }

    public List<GameModifier> createModifiers(GameMode mode, Difficulty difficulty, Random rng) {
        return createModifiers(mode, difficulty, rng, SolverStrategyType.OPTIMIZED_MRV_PRUNING);
    }

    public List<GameModifier> createModifiers(
            GameMode mode, Difficulty difficulty, Random rng, SolverStrategyType strategy) {
        return switch (mode) {
            case CLASSIC -> List.of();
            case BOT_CHALLENGE -> botChallengeModifiers(difficulty, rng, strategy);
        };
    }

    private List<GameModifier> botChallengeModifiers(Difficulty difficulty, Random rng, SolverStrategyType strategy) {
        GameBalanceConfig balance = GameBalanceConfig.forBotChallenge(difficulty);
        GameModifier bot = new BotModifier(balance, botStrategy, new Random(rng.nextLong()));
        return switch (difficulty) {
            case EASY, MEDIUM -> List.of(bot);
            case HARD -> List.of(bot, new CageReshapeModifier(
                    reshapeIntervalOverrideMs > 0 ? balance.withReshapeInterval(reshapeIntervalOverrideMs) : balance,
                    cageGenerator, strategy, new Random(rng.nextLong())));
        };
    }
}
