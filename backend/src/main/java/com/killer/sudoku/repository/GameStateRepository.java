package com.killer.sudoku.repository;

import com.killer.sudoku.model.GameSession;
import java.util.Optional;

public interface GameStateRepository {
    void save(String sessionId, GameSession session);

    Optional<GameSession> findById(String sessionId);
}
