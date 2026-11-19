package com.killer.sudoku.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class Board {

    public static final int SIZE = 9;
    public static final int BOX_SIZE = 3;

    private final Cell[][] cells;
    private List<Cage> cages;
    private Map<Position, Cage> cageByPosition;

    public Board(Cell[][] cells, List<Cage> cages) {
        if (cells == null || cells.length != SIZE) {
            throw new IllegalArgumentException("Board must have " + SIZE + " rows");
        }
        this.cells = new Cell[SIZE][SIZE];
        for (int row = 0; row < SIZE; row++) {
            if (cells[row] == null || cells[row].length != SIZE) {
                throw new IllegalArgumentException("Board row " + row + " must have " + SIZE + " cells");
            }
            for (int col = 0; col < SIZE; col++) {
                Cell cell = cells[row][col];
                if (cell == null || cell.getRow() != row || cell.getCol() != col) {
                    throw new IllegalArgumentException("Cell at (" + row + ", " + col + ") is missing or misplaced");
                }
                this.cells[row][col] = cell;
            }
        }
        installCages(cages);
    }

    public Cell getCell(int row, int col) {
        return cells[row][col];
    }

    public Cell getCell(Position position) {
        return cells[position.row()][position.col()];
    }

    public List<Cage> getCages() {
        return cages;
    }

    public Cage getCageAt(Position position) {
        return cageByPosition.get(position);
    }

    public void replaceCages(List<Cage> newCages) {
        installCages(newCages);
    }

    public boolean isValidMove(Position position, int value) {
        return isValidMove(position.row(), position.col(), value);
    }

    public boolean isValidMove(int row, int col, int value) {
        if (row < 0 || row >= SIZE || col < 0 || col >= SIZE || value < 1 || value > SIZE) {
            return false;
        }
        Cell target = cells[row][col];
        if (target.isGiven()) {
            return false;
        }
        return !violatesUnitRules(row, col, value) && fitsCage(target, value);
    }

    public List<Position> getEmptyCells() {
        List<Position> empty = new ArrayList<>();
        for (int row = 0; row < SIZE; row++) {
            for (int col = 0; col < SIZE; col++) {
                if (cells[row][col].isEmpty()) {
                    empty.add(new Position(row, col));
                }
            }
        }
        return empty;
    }

    public int getEmptyCellsCount() {
        int count = 0;
        for (int row = 0; row < SIZE; row++) {
            for (int col = 0; col < SIZE; col++) {
                if (cells[row][col].isEmpty()) {
                    count++;
                }
            }
        }
        return count;
    }

    public boolean isComplete() {
        for (int row = 0; row < SIZE; row++) {
            for (int col = 0; col < SIZE; col++) {
                if (!cells[row][col].isSolved()) {
                    return false;
                }
            }
        }
        return true;
    }

    private boolean violatesUnitRules(int row, int col, int value) {
        for (int i = 0; i < SIZE; i++) {
            if (i != col && cells[row][i].getCurrentValue() == value) {
                return true;
            }
            if (i != row && cells[i][col].getCurrentValue() == value) {
                return true;
            }
        }
        int boxRow = row - row % BOX_SIZE;
        int boxCol = col - col % BOX_SIZE;
        for (int r = boxRow; r < boxRow + BOX_SIZE; r++) {
            for (int c = boxCol; c < boxCol + BOX_SIZE; c++) {
                if ((r != row || c != col) && cells[r][c].getCurrentValue() == value) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean fitsCage(Cell target, int value) {
        Cage cage = cageByPosition.get(target.position());
        int sum = value;
        boolean otherCellsFilled = true;
        for (Position position : cage.cells()) {
            if (position.equals(target.position())) {
                continue;
            }
            int current = getCell(position).getCurrentValue();
            if (current == value) {
                return false;
            }
            if (current == Cell.EMPTY) {
                otherCellsFilled = false;
            } else {
                sum += current;
            }
        }
        return otherCellsFilled ? sum == cage.targetSum() : sum < cage.targetSum();
    }

    private void installCages(List<Cage> candidate) {
        if (candidate == null || candidate.isEmpty()) {
            throw new IllegalArgumentException("Board requires at least one cage");
        }
        Set<Integer> ids = new HashSet<>();
        Set<Position> covered = new HashSet<>();
        Map<Position, Cage> index = new HashMap<>();
        for (Cage cage : candidate) {
            if (!ids.add(cage.id())) {
                throw new IllegalArgumentException("Duplicate cage id: " + cage.id());
            }
            Set<Integer> digits = new HashSet<>();
            int solutionSum = 0;
            for (Position position : cage.cells()) {
                if (!covered.add(position)) {
                    throw new IllegalArgumentException("Cell " + position + " belongs to more than one cage");
                }
                int digit = getCell(position).getSolutionValue();
                if (!digits.add(digit)) {
                    throw new IllegalArgumentException("Cage " + cage.id() + " repeats digit " + digit);
                }
                solutionSum += digit;
                index.put(position, cage);
            }
            if (solutionSum != cage.targetSum()) {
                throw new IllegalArgumentException("Cage " + cage.id() + " target " + cage.targetSum()
                        + " does not match solution sum " + solutionSum);
            }
        }
        if (covered.size() != SIZE * SIZE) {
            throw new IllegalArgumentException("Cages must cover all " + SIZE * SIZE + " cells");
        }
        this.cages = Collections.unmodifiableList(new ArrayList<>(candidate));
        this.cageByPosition = Map.copyOf(index);
    }
}
