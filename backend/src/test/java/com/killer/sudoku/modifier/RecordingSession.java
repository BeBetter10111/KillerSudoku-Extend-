package com.killer.sudoku.modifier;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.PuzzleGenerator;
import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.PlayerHealth;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.service.TimerService;
import com.killer.sudoku.support.RecordingListener;
import java.util.List;

final class RecordingSession extends GameSession {

    final RecordingListener recorder = new RecordingListener();

    private RecordingSession(Board board, PlayerHealth health) {
        super("test-session", GameMode.BOT_CHALLENGE, Difficulty.MEDIUM, "test-seed", null,
                board, health, new TimerService(), List.of());
        addListener(recorder);
    }

    static RecordingSession withPuzzle(Difficulty difficulty, String seed, int maxHp) {
        PuzzleGenerator generator = new PuzzleGenerator(new BacktrackingCageGenerator());
        return new RecordingSession(generator.generate(difficulty, seed), new PlayerHealth(maxHp));
    }

    List<String> types() {
        return recorder.types();
    }

    RecordingListener.BotSnapshot lastBot() {
        return (RecordingListener.BotSnapshot) recorder.last("BOT").data();
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
