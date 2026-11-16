package com.killer.sudoku.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.SudokuSolver;
import com.killer.sudoku.algorithm.WeightedRandomBotStrategy;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.modifier.BotModifier;
import com.killer.sudoku.modifier.CageReshapeModifier;
import com.killer.sudoku.modifier.GameModifier;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class DifficultyConfigTest {

    private final DifficultyConfig config =
            new DifficultyConfig(new WeightedRandomBotStrategy(), new BacktrackingCageGenerator(new SudokuSolver()));

    @Test
    void classicHasNoModifiersForAnyDifficulty() {
        for (Difficulty difficulty : Difficulty.values()) {
            assertTrue(config.createModifiers(GameMode.CLASSIC, difficulty, new Random(1)).isEmpty());
        }
    }

    @Test
    void botChallengeEasyAndMediumHaveOnlyBotModifier() {
        for (Difficulty difficulty : List.of(Difficulty.EASY, Difficulty.MEDIUM)) {
            List<GameModifier> modifiers = config.createModifiers(GameMode.BOT_CHALLENGE, difficulty, new Random(1));
            assertEquals(1, modifiers.size());
            assertInstanceOf(BotModifier.class, modifiers.get(0));
        }
    }

    @Test
    void botChallengeHardHasBotThenReshape() {
        List<GameModifier> modifiers = config.createModifiers(GameMode.BOT_CHALLENGE, Difficulty.HARD, new Random(1));
        assertEquals(2, modifiers.size());
        assertInstanceOf(BotModifier.class, modifiers.get(0));
        assertInstanceOf(CageReshapeModifier.class, modifiers.get(1));
    }
}
