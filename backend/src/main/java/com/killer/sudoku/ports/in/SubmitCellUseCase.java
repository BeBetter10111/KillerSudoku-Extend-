package main.java.com.killer.sudoku.ports.in;

public interface SubmitCellUseCase {
    void submitCell(int row, int column, int value);
}
