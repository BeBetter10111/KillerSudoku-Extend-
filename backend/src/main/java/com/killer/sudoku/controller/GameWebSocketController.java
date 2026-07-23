package com.killer.sudoku.controller;

import com.killer.sudoku.service.GamePlayService;

public class GameWebSocketController {
    private final GamePlayService gamePlayService;

    public GameWebSocketController(GamePlayService gamePlayService) {
        this.gamePlayService = gamePlayService;
    }

    public void submitCell(int row, int column, int value) {
        gamePlayService.submitCell(row, column, value);
    }
}
