package com.killer.sudoku.model;

import java.util.List;

public class GameSession {
    private final Board board;
    private final List<Cage> cages;

    public GameSession(Board board, List<Cage> cages) {
        this.board = board;
        this.cages = cages;
    }

    public Board getBoard() {
        return board;
    }

    public List<Cage> getCages() {
        return cages;
    }
}
