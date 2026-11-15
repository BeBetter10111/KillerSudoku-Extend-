package com.killer.sudoku.model;

import java.util.List;

public record Cage(int id, List<Position> cells, int targetSum) {

    public Cage {
        if (cells == null || cells.isEmpty() || cells.size() > Board.SIZE) {
            throw new IllegalArgumentException("Cage must contain between 1 and " + Board.SIZE + " cells");
        }
        if (targetSum <= 0) {
            throw new IllegalArgumentException("Cage target sum must be positive: " + targetSum);
        }
        cells = List.copyOf(cells);
    }

    public boolean contains(Position position) {
        return cells.contains(position);
    }

    public int size() {
        return cells.size();
    }
}
