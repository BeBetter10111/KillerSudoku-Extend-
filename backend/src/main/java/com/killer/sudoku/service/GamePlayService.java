package com.killer.sudoku.service;

import com.killer.sudoku.repository.GameStateRepository;
import com.killer.sudoku.service.modifier.GameModifier;
import java.util.List;

public class GamePlayService {
    private final GameStateRepository gameStateRepository;
    private final GameNotificationService gameNotification;
    private final DistributedLockService distributedLock;
    private final List<GameModifier> modifiers;

    public GamePlayService(
            GameStateRepository gameStateRepository,
            GameNotificationService gameNotification,
            DistributedLockService distributedLock,
            List<GameModifier> modifiers) {
        this.gameStateRepository = gameStateRepository;
        this.gameNotification = gameNotification;
        this.distributedLock = distributedLock;
        this.modifiers = modifiers;
    }

    public void submitCell(int row, int column, int value) {
        // Placeholder: lock, validate, run modifiers, persist, notify
    }
}
