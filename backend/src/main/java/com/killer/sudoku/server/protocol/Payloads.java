package com.killer.sudoku.server.protocol;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Position;
import java.util.List;

public final class Payloads {

    private Payloads() {
    }

    public record CellUpdate(Position position, int value, boolean correct) {
    }

    public record Alert(long secondsRemaining) {
    }

    public record CagesReshaped(List<Cage> cages, AlgorithmMetrics metrics) {
    }

    public record Tick(long elapsedMs, Long botRemainingMs, Long reshapeRemainingMs) {
    }

    public record GameOver(boolean won, long finalTimeMs, String reason) {
    }

    public record ErrorMessage(String message) {
    }
}
