package com.killer.sudoku.event;

public enum GameEventType {
    GAME_STARTED,
    CELL_UPDATED,
    MOVE_REJECTED,
    BOT_SPAWNED,
    BOT_REVEALED,
    BOT_TIMEOUT,
    BOT_DEACTIVATED,
    HP_CHANGED,
    ALERT_WARNING,
    CAGE_RESHAPED,
    GAME_WON,
    GAME_LOST
}
