package com.killer.sudoku.server.protocol;

public enum GameEventType {
    GAME_STARTED,
    CELL_UPDATED,
    MOVE_REJECTED,
    BOT_UPDATED,
    HP_CHANGED,
    ALERT_WARNING,
    CAGE_RESHAPED,
    TICK,
    GAME_WON,
    GAME_LOST,
    ERROR
}
