package com.killer.sudoku.service;

import com.killer.sudoku.event.GameEventType;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.PlayerHealth;

public class GameSession {

    private final Board board;
    private final PlayerHealth playerHealth;

    public GameSession(Board board, PlayerHealth playerHealth) {
        this.board = board;
        this.playerHealth = playerHealth;
    }

    public Board getBoard() {
        return board;
    }

    public PlayerHealth getPlayerHealth() {
        return playerHealth;
    }

    public void publish(GameEventType type, Object payload) {
    }
}
