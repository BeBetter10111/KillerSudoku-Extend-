package com.killer.sudoku.event;

public record AlertPayload(String message, long remainingMs) {
}
