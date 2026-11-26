package com.killer.sudoku.core;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.PlayerHealth;
import com.killer.sudoku.model.Position;
import java.util.List;

public interface GameEventListener {

    void onInitState(GameSession session, AlgorithmMetrics metrics);

    void onCellUpdated(Position position, int value, boolean correct);

    void onHpUpdated(PlayerHealth health);

    void onBotUpdated(BotEntity bot);

    void onAlertWarning(long secondsRemaining);

    void onCagesReshaped(List<Cage> cages, AlgorithmMetrics metrics);

    void onTick(long elapsedMs, Long botRemainingMs, Long reshapeRemainingMs);

    default void onTick(long elapsedMs, Long botRemainingMs, Long reshapeRemainingMs, Long botSpawnRemainingMs) {
        onTick(elapsedMs, botRemainingMs, reshapeRemainingMs);
    }

    void onGameOver(boolean won, long finalTimeMs, String reason);
}
