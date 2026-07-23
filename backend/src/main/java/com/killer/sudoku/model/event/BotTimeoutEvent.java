package com.killer.sudoku.model.event;

public record BotTimeoutEvent(int damageTaken) implements DomainEvent {
    @Override
    public String getEventType() {
        return "BOT_TIMEOUT";
    }
}
