package com.killer.sudoku.modifier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.SudokuSolver;
import com.killer.sudoku.config.GameBalanceConfig;
import com.killer.sudoku.event.AlertPayload;
import com.killer.sudoku.event.GameEventType;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Difficulty;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class CageReshapeModifierTest {

    private final GameBalanceConfig balance = GameBalanceConfig.forBotChallenge(Difficulty.HARD);

    private CageReshapeModifier newModifier(long seed) {
        return new CageReshapeModifier(balance, new BacktrackingCageGenerator(new SudokuSolver()), new Random(seed));
    }

    private RecordingSession session() {
        return RecordingSession.withPuzzle(Difficulty.HARD, "reshape-mod", balance.maxHp());
    }

    @Test
    void startsAtFullInterval() {
        CageReshapeModifier modifier = newModifier(1);
        modifier.onInit(session());
        assertEquals(300_000, modifier.getTimeUntilReshapeMs());
        assertTrue(modifier.isActive());
    }

    @Test
    void emitsNothingBeforeAlertWindow() {
        RecordingSession session = session();
        CageReshapeModifier modifier = newModifier(1);
        modifier.onInit(session);
        modifier.onTick(session, 289_999);

        assertTrue(session.events.isEmpty());
        assertEquals(10_001, modifier.getTimeUntilReshapeMs());
    }

    @Test
    void emitsAlertExactlyOncePerCycleAtTenSecondsRemaining() {
        RecordingSession session = session();
        CageReshapeModifier modifier = newModifier(1);
        modifier.onInit(session);
        modifier.onTick(session, 290_000);
        modifier.onTick(session, 1_000);
        modifier.onTick(session, 1_000);

        assertEquals(List.of(GameEventType.ALERT_WARNING), session.types());
        AlertPayload payload = (AlertPayload) session.events.get(0).payload();
        assertEquals(10_000, payload.remainingMs());
    }

    @Test
    void reshapesAtZeroReplacesCagesAndRestartsCycle() {
        RecordingSession session = session();
        List<Cage> before = session.getBoard().getCages();
        CageReshapeModifier modifier = newModifier(2);
        modifier.onInit(session);
        modifier.onTick(session, 290_000);
        modifier.onTick(session, 10_000);

        assertNotEquals(before, session.getBoard().getCages());
        assertEquals(300_000, modifier.getTimeUntilReshapeMs());
        assertEquals(List.of(GameEventType.ALERT_WARNING, GameEventType.CAGE_RESHAPED), session.types());
        @SuppressWarnings("unchecked")
        List<Cage> published = (List<Cage>) session.last(GameEventType.CAGE_RESHAPED).payload();
        assertIterableEquals(published, session.getBoard().getCages());
    }

    @Test
    void reshapePreservesCellValues() {
        RecordingSession session = session();
        session.solveAllExcept(30);
        int[][] before = values(session);
        CageReshapeModifier modifier = newModifier(3);
        modifier.onInit(session);
        modifier.onTick(session, 300_000);

        assertTrue(java.util.Arrays.deepEquals(before, values(session)));
        assertTrue(session.types().contains(GameEventType.CAGE_RESHAPED));
    }

    @Test
    void alertFiresAgainInNextCycle() {
        RecordingSession session = session();
        CageReshapeModifier modifier = newModifier(4);
        modifier.onInit(session);
        modifier.onTick(session, 300_000);
        modifier.onTick(session, 290_000);

        assertEquals(2, session.types().stream().filter(t -> t == GameEventType.ALERT_WARNING).count());
    }

    @Test
    void oversizedTickAlertsThenReshapesOnce() {
        RecordingSession session = session();
        CageReshapeModifier modifier = newModifier(5);
        modifier.onInit(session);
        modifier.onTick(session, 900_000);

        assertEquals(List.of(GameEventType.ALERT_WARNING, GameEventType.CAGE_RESHAPED), session.types());
        assertEquals(0, ((AlertPayload) session.events.get(0).payload()).remainingMs());
        assertEquals(300_000, modifier.getTimeUntilReshapeMs());
    }

    @Test
    void rejectsConfigWithoutReshapeInterval() {
        GameBalanceConfig easy = GameBalanceConfig.forBotChallenge(Difficulty.EASY);
        assertThrows(IllegalArgumentException.class,
                () -> new CageReshapeModifier(easy, new BacktrackingCageGenerator(new SudokuSolver()), new Random(1)));
        assertFalse(easy.hasReshape());
    }

    private static int[][] values(RecordingSession session) {
        int[][] grid = new int[9][9];
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                grid[r][c] = session.getBoard().getCell(r, c).getCurrentValue();
            }
        }
        return grid;
    }
}
