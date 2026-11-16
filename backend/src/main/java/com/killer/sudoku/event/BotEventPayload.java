package com.killer.sudoku.event;

import com.killer.sudoku.model.Position;

public record BotEventPayload(Position position, long remainingTimeoutMs, long maxTimeoutMs) {

    public static BotEventPayload hidden(long maxTimeoutMs) {
        return new BotEventPayload(null, maxTimeoutMs, maxTimeoutMs);
    }
}
