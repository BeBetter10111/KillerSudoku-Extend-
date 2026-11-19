package com.killer.sudoku.model;

import lombok.Getter;

@Getter
public class PlayerHealth {

    private final int maxHp;
    private int currentHp;

    public PlayerHealth(int maxHp) {
        if (maxHp <= 0) {
            throw new IllegalArgumentException("maxHp must be positive: " + maxHp);
        }
        this.maxHp = maxHp;
        this.currentHp = maxHp;
    }

    public void deductHp(int amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("Deducted HP must not be negative: " + amount);
        }
        this.currentHp = Math.max(0, currentHp - amount);
    }

    public boolean isDead() {
        return currentHp <= 0;
    }
}
