package com.killer.sudoku.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class TimerServiceTest {

    @Test
    void ignoresTicksUntilStarted() {
        TimerService timer = new TimerService();
        timer.tick(500);
        assertEquals(0, timer.getElapsedMs());
        assertFalse(timer.isRunning());
    }

    @Test
    void accumulatesWhileRunningAndFreezesAfterStop() {
        TimerService timer = new TimerService();
        timer.start();
        timer.tick(500);
        timer.tick(250);
        assertTrue(timer.isRunning());
        assertEquals(750, timer.getElapsedMs());
        timer.stop();
        timer.tick(1_000);
        assertEquals(750, timer.getElapsedMs());
        timer.start();
        timer.tick(100);
        assertEquals(850, timer.getElapsedMs());
    }

    @Test
    void rejectsNegativeDelta() {
        assertThrows(IllegalArgumentException.class, () -> new TimerService().tick(-1));
    }
}
