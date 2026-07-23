package com.killer.sudoku.model.event;

public record BotRevealedEvent(int row, int col, int timeoutSeconds) implements DomainEvent {
    @Override
    public String getEventType() {
        return "BOT_REVEALED";
    }
}
