package com.killer.sudoku.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PlayerHealthTest {

    @Test
    void deductsAndClampsAtZero() {
        PlayerHealth health = new PlayerHealth(3);
        health.deductHp(1);
        assertEquals(2, health.getCurrentHp());
        assertFalse(health.isDead());
        health.deductHp(5);
        assertEquals(0, health.getCurrentHp());
        assertTrue(health.isDead());
    }

    @Test
    void rejectsNegativeDeduction() {
        assertThrows(IllegalArgumentException.class, () -> new PlayerHealth(3).deductHp(-1));
    }
}
