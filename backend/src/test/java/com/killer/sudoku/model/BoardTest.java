package com.killer.sudoku.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BoardTest {

    private Board board;

    @BeforeEach
    void setUp() {
        board = new Board(buildCells(), buildTripleCages());
    }

    @Test
    void startsWithAllCellsEmpty() {
        assertEquals(81, board.getEmptyCellsCount());
        assertEquals(81, board.getEmptyCells().size());
        assertFalse(board.isComplete());
    }

    @Test
    void rejectsValueConflictingWithRow() {
        board.getCell(0, 0).place(solution(0, 0));
        assertFalse(board.isValidMove(0, 5, solution(0, 0)));
    }

    @Test
    void rejectsValueThatLeavesNoRoomInOpenCage() {
        board.getCell(0, 0).place(solution(0, 0));
        assertFalse(board.isValidMove(0, 1, 5));
        assertTrue(board.isValidMove(0, 1, solution(0, 1)));
    }

    @Test
    void closingCageMustMatchTargetSum() {
        board.getCell(0, 0).place(solution(0, 0));
        board.getCell(0, 1).place(solution(0, 1));
        assertTrue(board.isValidMove(0, 2, solution(0, 2)));
        assertFalse(board.isValidMove(0, 2, solution(0, 2) % 9 + 1));
    }

    @Test
    void rejectsOutOfRangeValuesAndPositions() {
        assertFalse(board.isValidMove(0, 0, 0));
        assertFalse(board.isValidMove(0, 0, 10));
        assertFalse(board.isValidMove(-1, 0, 1));
        assertFalse(board.isValidMove(0, 9, 1));
    }

    @Test
    void isCompleteWhenEveryCellMatchesSolution() {
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                board.getCell(row, col).place(solution(row, col));
            }
        }
        assertTrue(board.isComplete());
        assertEquals(0, board.getEmptyCellsCount());
    }

    @Test
    void replaceCagesAcceptsValidPartition() {
        List<Cage> rowCages = new ArrayList<>();
        for (int row = 0; row < 9; row++) {
            List<Position> positions = new ArrayList<>();
            for (int col = 0; col < 9; col++) {
                positions.add(new Position(row, col));
            }
            rowCages.add(new Cage(row, positions, 45));
        }
        board.replaceCages(rowCages);
        assertEquals(9, board.getCages().size());
        assertEquals(45, board.getCageAt(new Position(4, 4)).targetSum());
    }

    @Test
    void replaceCagesRejectsIncompleteCoverage() {
        List<Cage> partial = new ArrayList<>(board.getCages());
        partial.remove(0);
        assertThrows(IllegalArgumentException.class, () -> board.replaceCages(partial));
        assertEquals(27, board.getCages().size());
    }

    @Test
    void replaceCagesRejectsWrongTargetSum() {
        List<Cage> tampered = new ArrayList<>(board.getCages());
        Cage first = tampered.get(0);
        tampered.set(0, new Cage(first.id(), first.cells(), first.targetSum() + 1));
        assertThrows(IllegalArgumentException.class, () -> board.replaceCages(tampered));
    }

    @Test
    void givenCellCannotBeModified() {
        Cell given = new Cell(0, 0, 5, true);
        assertThrows(IllegalStateException.class, () -> given.place(3));
        assertTrue(given.isSolved());
    }

    private static int solution(int row, int col) {
        return (3 * (row % 3) + row / 3 + col) % 9 + 1;
    }

    private static Cell[][] buildCells() {
        Cell[][] cells = new Cell[9][9];
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                cells[row][col] = new Cell(row, col, solution(row, col), false);
            }
        }
        return cells;
    }

    private static List<Cage> buildTripleCages() {
        List<Cage> cages = new ArrayList<>();
        int id = 0;
        for (int row = 0; row < 9; row++) {
            for (int start = 0; start < 9; start += 3) {
                List<Position> positions = new ArrayList<>();
                int sum = 0;
                for (int col = start; col < start + 3; col++) {
                    positions.add(new Position(row, col));
                    sum += solution(row, col);
                }
                cages.add(new Cage(id++, positions, sum));
            }
        }
        return cages;
    }
}
