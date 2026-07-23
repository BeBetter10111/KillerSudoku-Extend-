package com.killer.sudoku.service.modifier;

import com.killer.sudoku.model.GameSession;
import com.killer.sudoku.model.event.DomainEvent;
import java.util.Collections;
import java.util.List;

public class CageReshapeModifier implements GameModifier {
    @Override
    public List<DomainEvent> onInit(GameSession session) {
        return Collections.emptyList();
    }

    @Override
    public List<DomainEvent> onTick(GameSession session, int deltaSeconds) {
        return Collections.emptyList();
    }

    @Override
    public List<DomainEvent> onCorrectAnswer(GameSession session, int row, int col) {
        return Collections.emptyList();
    }
}
