package com.killer.sudoku.model.event;

public record ReshapeWarningEvent(int secondsLeft) implements DomainEvent {
    @Override
    public String getEventType() {
        return "RESHAPE_WARNING";
    }
}
