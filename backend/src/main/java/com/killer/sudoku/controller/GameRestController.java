package com.killer.sudoku.controller;

import com.killer.sudoku.service.GameInitializationService;
import com.killer.sudoku.service.GamePlayService;

public class GameRestController {
    private final GameInitializationService gameInitializationService;
    private final GamePlayService gamePlayService;

    public GameRestController(
            GameInitializationService gameInitializationService,
            GamePlayService gamePlayService) {
        this.gameInitializationService = gameInitializationService;
        this.gamePlayService = gamePlayService;
    }

    public void startGame() {
        gameInitializationService.startGame();
    }

    public void submitCell(int row, int column, int value) {
        gamePlayService.submitCell(row, column, value);
    }
}
