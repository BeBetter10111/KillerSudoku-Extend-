package com.killer.sudoku.modifier;

import com.killer.sudoku.model.Position;
import com.killer.sudoku.service.GameSession;

public interface GameModifier {

    void onInit(GameSession session);

    void onCorrectAnswer(GameSession session, Position pos);

    void onTick(GameSession session, long deltaMs);

    boolean isActive();
}
