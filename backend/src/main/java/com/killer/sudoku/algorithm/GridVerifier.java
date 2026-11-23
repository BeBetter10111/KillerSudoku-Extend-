package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Position;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class GridVerifier {

    private static final int SIZE = Board.SIZE;

    private GridVerifier() {
    }

    public static boolean isValidSolution(int[][] grid, int[][] givens, List<Cage> cages) {
        return firstViolation(grid, givens, cages) == null;
    }

    public static String firstViolation(int[][] grid, int[][] givens, List<Cage> cages) {
        if (grid == null || grid.length != SIZE) {
            return "grid must have " + SIZE + " rows";
        }
        for (int row = 0; row < SIZE; row++) {
            if (grid[row] == null || grid[row].length != SIZE) {
                return "grid row " + row + " must have " + SIZE + " columns";
            }
            Set<Integer> rowDigits = new HashSet<>();
            for (int col = 0; col < SIZE; col++) {
                int value = grid[row][col];
                if (value < 1 || value > SIZE) {
                    return "invalid value at (" + row + ", " + col + ")";
                }
                if (!rowDigits.add(value)) {
                    return "duplicate in row " + row;
                }
                if (givens != null) {
                    if (givens.length != SIZE || givens[row] == null || givens[row].length != SIZE) {
                        return "givens have invalid shape";
                    }
                    if (givens[row][col] != 0 && givens[row][col] != value) {
                        return "given mismatch at (" + row + ", " + col + ")";
                    }
                }
            }
        }

        for (int col = 0; col < SIZE; col++) {
            Set<Integer> colDigits = new HashSet<>();
            for (int row = 0; row < SIZE; row++) {
                if (!colDigits.add(grid[row][col])) {
                    return "duplicate in column " + col;
                }
            }
        }
        for (int boxRow = 0; boxRow < SIZE; boxRow += Board.BOX_SIZE) {
            for (int boxCol = 0; boxCol < SIZE; boxCol += Board.BOX_SIZE) {
                Set<Integer> boxDigits = new HashSet<>();
                for (int row = boxRow; row < boxRow + Board.BOX_SIZE; row++) {
                    for (int col = boxCol; col < boxCol + Board.BOX_SIZE; col++) {
                        if (!boxDigits.add(grid[row][col])) {
                            return "duplicate in box at (" + boxRow + ", " + boxCol + ")";
                        }
                    }
                }
            }
        }

        if (cages == null) {
            return null;
        }
        Set<Position> covered = new HashSet<>();
        for (Cage cage : cages) {
            Set<Integer> cageDigits = new HashSet<>();
            int sum = 0;
            for (Position position : cage.cells()) {
                if (!covered.add(position)) {
                    return "cell " + position + " belongs to more than one cage";
                }
                int value = grid[position.row()][position.col()];
                if (!cageDigits.add(value)) {
                    return "duplicate digit in cage " + cage.id();
                }
                sum += value;
            }
            if (sum != cage.targetSum()) {
                return "cage " + cage.id() + " sum mismatch";
            }
        }
        if (covered.size() != SIZE * SIZE) {
            return "cages do not cover the full board";
        }
        return null;
    }
}
