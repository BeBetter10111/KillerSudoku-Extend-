package com.killer.sudoku.server.protocol;

public record SubmitCellRequest(int row, int col, int value) {
}
