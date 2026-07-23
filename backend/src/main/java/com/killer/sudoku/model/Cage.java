package com.killer.sudoku.model;

import java.util.List;

public class Cage {
    private final List<Cell> cells;
    private final int targetSum;

    public Cage(List<Cell> cells, int targetSum) {
        this.cells = cells;
        this.targetSum = targetSum;
    }

    public List<Cell> getCells() {
        return cells;
    }

    public int getTargetSum() {
        return targetSum;
    }
}
