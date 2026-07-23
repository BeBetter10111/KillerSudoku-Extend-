package com.killer.sudoku.model.event;

import com.killer.sudoku.model.Cage;
import java.util.List;

public record BoardReshapedEvent(List<Cage> newCageLayout) implements DomainEvent {
    @Override
    public String getEventType() {
        return "BOARD_RESHAPED";
    }
}
