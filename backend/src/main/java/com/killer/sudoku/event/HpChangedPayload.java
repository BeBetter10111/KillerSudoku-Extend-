package com.killer.sudoku.event;

public record HpChangedPayload(int currentHp, int maxHp, int delta) {
}
