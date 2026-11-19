package com.killer.sudoku.model;

import lombok.Getter;

@Getter
public class Cell {

    public static final int EMPTY = 0;

    private final int row;
    private final int col;
    private final int solutionValue;
    private final boolean given;
    private int currentValue;
    private boolean solved;

    public Cell(int row, int col, int solutionValue, boolean given) {
        Position position = new Position(row, col);
        requireDigit(solutionValue);
        this.row = position.row();
        this.col = position.col();
        this.solutionValue = solutionValue;
        this.given = given;
        this.currentValue = given ? solutionValue : EMPTY;
        this.solved = given;
    }

    public Position position() {
        return new Position(row, col);
    }

    public boolean isEmpty() {
        return currentValue == EMPTY;
    }

    public void place(int value) {
        requireMutable();
        requireDigit(value);
        this.currentValue = value;
        this.solved = value == solutionValue;
    }

    public void clear() {
        requireMutable();
        this.currentValue = EMPTY;
        this.solved = false;
    }

    private void requireMutable() {
        if (given) {
            throw new IllegalStateException("Cannot modify given cell at (" + row + ", " + col + ")");
        }
    }

    private static void requireDigit(int value) {
        if (value < 1 || value > Board.SIZE) {
            throw new IllegalArgumentException("Cell value must be between 1 and " + Board.SIZE + ": " + value);
        }
    }
}
