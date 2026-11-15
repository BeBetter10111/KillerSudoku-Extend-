package com.killer.sudoku.algorithm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.Position;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import org.junit.jupiter.api.Test;

class WeightedRandomBotStrategyTest {

    private final WeightedRandomBotStrategy strategy = new WeightedRandomBotStrategy();

    @Test
    void neverSelectsJustSolvedCellWhenOthersExist() {
        Position solved = new Position(4, 4);
        List<Position> empty = List.of(solved, new Position(0, 0), new Position(8, 8), new Position(4, 5));
        Random rng = new Random(3);
        for (int i = 0; i < 500; i++) {
            assertFalse(solved.equals(strategy.selectNext(empty, solved, rng).orElseThrow()));
        }
    }

    @Test
    void fallsBackToJustSolvedCellWhenItIsTheOnlyOneLeft() {
        Position solved = new Position(1, 1);
        assertEquals(Optional.of(solved), strategy.selectNext(List.of(solved), solved, new Random(1)));
    }

    @Test
    void returnsEmptyWhenNoEmptyCells() {
        assertTrue(strategy.selectNext(List.of(), null, new Random(1)).isEmpty());
    }

    @Test
    void isDeterministicForSameSeed() {
        List<Position> empty = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            empty.add(new Position(i / 9, i % 9));
        }
        Position solved = new Position(0, 0);
        Random a = new Random(11);
        Random b = new Random(11);
        for (int i = 0; i < 50; i++) {
            assertEquals(strategy.selectNext(empty, solved, a), strategy.selectNext(empty, solved, b));
        }
    }

    @Test
    void prefersCellsFartherFromJustSolvedCell() {
        Position solved = new Position(0, 0);
        Position near = new Position(0, 1);
        Position far = new Position(8, 8);
        List<Position> empty = List.of(near, far);
        Random rng = new Random(5);
        int farPicks = 0;
        for (int i = 0; i < 1000; i++) {
            if (strategy.selectNext(empty, solved, rng).orElseThrow().equals(far)) {
                farPicks++;
            }
        }
        assertTrue(farPicks > 800, "far picks: " + farPicks);
    }
}
