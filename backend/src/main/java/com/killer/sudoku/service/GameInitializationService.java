package com.killer.sudoku.service;

import com.killer.sudoku.repository.GameStateRepository;
import com.killer.sudoku.service.modifier.GameModifier;
import java.util.List;

public class GameInitializationService {
    private final GameStateRepository gameStateRepository;
    private final GameNotificationService gameNotification;
    private final List<GameModifier> modifiers;

    public GameInitializationService(
            GameStateRepository gameStateRepository,
            GameNotificationService gameNotification,
            List<GameModifier> modifiers) {
        this.gameStateRepository = gameStateRepository;
        this.gameNotification = gameNotification;
        this.modifiers = modifiers;
    }

    public void startGame() {
        // Placeholder: create session, run modifiers.onInit, persist, notify
    }
}
