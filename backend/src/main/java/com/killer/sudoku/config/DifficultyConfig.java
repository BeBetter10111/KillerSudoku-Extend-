package com.killer.sudoku.config;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.WeightedRandomBotStrategy;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.modifier.BotModifier;
import com.killer.sudoku.modifier.CageReshapeModifier;
import com.killer.sudoku.modifier.GameModifier;
import java.util.List;
import java.util.Random;

public final class DifficultyConfig {

    private final WeightedRandomBotStrategy botStrategy;
    private final BacktrackingCageGenerator cageGenerator;

    public DifficultyConfig(WeightedRandomBotStrategy botStrategy, BacktrackingCageGenerator cageGenerator) {
        this.botStrategy = botStrategy;
        this.cageGenerator = cageGenerator;
    }

    public List<GameModifier> createModifiers(GameMode mode, Difficulty difficulty, Random rng) {
        return switch (mode) {
            case CLASSIC -> List.of();
            case BOT_CHALLENGE -> botChallengeModifiers(difficulty, rng);
        };
    }

    private List<GameModifier> botChallengeModifiers(Difficulty difficulty, Random rng) {
        GameBalanceConfig balance = GameBalanceConfig.forBotChallenge(difficulty);
        GameModifier bot = new BotModifier(balance, botStrategy, new Random(rng.nextLong()));
        return switch (difficulty) {
            case EASY, MEDIUM -> List.of(bot);
            case HARD -> List.of(bot, new CageReshapeModifier(balance, cageGenerator, new Random(rng.nextLong())));
        };
    }
}
