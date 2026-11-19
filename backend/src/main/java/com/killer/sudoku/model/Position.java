package com.killer.sudoku.model;

public record Position(int row, int col) {

    public Position {
        if (row < 0 || row >= Board.SIZE || col < 0 || col >= Board.SIZE) {
            throw new IllegalArgumentException("Position out of bounds: (" + row + ", " + col + ")");
        }
    }

    public int boxIndex() {
        return (row / Board.BOX_SIZE) * Board.BOX_SIZE + col / Board.BOX_SIZE;
    }
}
