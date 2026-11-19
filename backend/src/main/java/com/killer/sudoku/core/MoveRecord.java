package com.killer.sudoku.core;

import com.killer.sudoku.model.Position;

public record MoveRecord(Position position, int value, long elapsedMs, boolean correct) {
}
