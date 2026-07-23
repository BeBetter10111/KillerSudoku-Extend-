package com.killer.sudoku.model;

public class Cell {
    private final int row;
    private final int column;
    private final Integer value;

    public Cell(int row, int column, Integer value) {
        this.row = row;
        this.column = column;
        this.value = value;
    }

    public int getRow() {
        return row;
    }

    public int getColumn() {
        return column;
    }

    public Integer getValue() {
        return value;
    }
}
