package com.killer.sudoku.repository;

import com.killer.sudoku.model.GameSession;
import java.util.Optional;

public class JpaGameStateRepository implements GameStateRepository {
    @Override
    public void save(String sessionId, GameSession session) {
        // Placeholder: persist via JPA
    }

    @Override
    public Optional<GameSession> findById(String sessionId) {
        return Optional.empty();
    }
}
