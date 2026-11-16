package com.killer.sudoku.modifier;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.PuzzleGenerator;
import com.killer.sudoku.algorithm.SudokuSolver;
import com.killer.sudoku.event.GameEventType;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.PlayerHealth;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.service.GameSession;
import java.util.ArrayList;
import java.util.List;

final class RecordingSession extends GameSession {

    record Published(GameEventType type, Object payload) {
    }

    final List<Published> events = new ArrayList<>();

    RecordingSession(Board board, PlayerHealth health) {
        super(board, health);
    }

    static RecordingSession withPuzzle(Difficulty difficulty, String seed, int maxHp) {
        SudokuSolver solver = new SudokuSolver();
        PuzzleGenerator generator = new PuzzleGenerator(solver, new BacktrackingCageGenerator(solver));
        return new RecordingSession(generator.generate(difficulty, seed), new PlayerHealth(maxHp));
    }

    @Override
    public void publish(GameEventType type, Object payload) {
        events.add(new Published(type, payload));
    }

    List<GameEventType> types() {
        return events.stream().map(Published::type).toList();
    }

    Published last(GameEventType type) {
        for (int i = events.size() - 1; i >= 0; i--) {
            if (events.get(i).type() == type) {
                return events.get(i);
            }
        }
        throw new AssertionError("No event of type " + type);
    }

    void solve(Position position) {
        Cell cell = getBoard().getCell(position);
        cell.place(cell.getSolutionValue());
    }

    void solveAllExcept(int remainingEmpty) {
        List<Position> empty = getBoard().getEmptyCells();
        for (int i = 0; i < empty.size() - remainingEmpty; i++) {
            solve(empty.get(i));
        }
    }
}
