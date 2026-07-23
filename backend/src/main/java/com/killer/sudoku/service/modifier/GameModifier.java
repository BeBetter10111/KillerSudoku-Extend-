package com.killer.sudoku.service.modifier;

import com.killer.sudoku.model.GameSession;
import com.killer.sudoku.model.event.DomainEvent;
import java.util.List;

public interface GameModifier {
    List<DomainEvent> onInit(GameSession session);

    List<DomainEvent> onTick(GameSession session, int deltaSeconds);

    List<DomainEvent> onCorrectAnswer(GameSession session, int row, int col);
}
