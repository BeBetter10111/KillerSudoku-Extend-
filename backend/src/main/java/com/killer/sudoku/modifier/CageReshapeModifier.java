package com.killer.sudoku.modifier;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.config.GameBalanceConfig;
import com.killer.sudoku.event.AlertPayload;
import com.killer.sudoku.event.GameEventType;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.service.GameSession;
import java.util.List;
import java.util.Random;

public final class CageReshapeModifier implements GameModifier {

    private static final String ALERT_MESSAGE = "Cages are about to reshape";

    private final long intervalMs;
    private final long alertMs;
    private final BacktrackingCageGenerator generator;
    private final Random rng;
    private long timeUntilReshapeMs;
    private boolean alertSent;

    public CageReshapeModifier(GameBalanceConfig config, BacktrackingCageGenerator generator, Random rng) {
        if (!config.hasReshape()) {
            throw new IllegalArgumentException("Balance config does not define a reshape interval");
        }
        this.intervalMs = config.reshapeIntervalMs();
        this.alertMs = config.preReshapeAlertMs();
        this.generator = generator;
        this.rng = rng;
        this.timeUntilReshapeMs = intervalMs;
    }

    @Override
    public void onInit(GameSession session) {
        timeUntilReshapeMs = intervalMs;
        alertSent = false;
    }

    @Override
    public void onCorrectAnswer(GameSession session, Position pos) {
    }

    @Override
    public void onTick(GameSession session, long deltaMs) {
        timeUntilReshapeMs -= deltaMs;
        if (timeUntilReshapeMs <= alertMs && !alertSent) {
            alertSent = true;
            session.publish(GameEventType.ALERT_WARNING,
                    new AlertPayload(ALERT_MESSAGE, Math.max(0, timeUntilReshapeMs)));
        }
        if (timeUntilReshapeMs <= 0) {
            reshape(session);
        }
    }

    @Override
    public boolean isActive() {
        return true;
    }

    public long getTimeUntilReshapeMs() {
        return timeUntilReshapeMs;
    }

    private void reshape(GameSession session) {
        Board board = session.getBoard();
        List<Cage> reshaped = generator.reshapeCages(board, rng);
        timeUntilReshapeMs = intervalMs;
        alertSent = false;
        if (reshaped.equals(board.getCages())) {
            return;
        }
        board.replaceCages(reshaped);
        session.publish(GameEventType.CAGE_RESHAPED, reshaped);
    }
}
