package com.killer.sudoku.modifier;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.CageLayoutResult;
import com.killer.sudoku.config.GameBalanceConfig;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import com.killer.sudoku.core.GameSession;
import java.util.Optional;
import java.util.Random;

public final class CageReshapeModifier implements GameModifier {

    private final long intervalMs;
    private final long alertMs;
    private final BacktrackingCageGenerator generator;
    private final SolverStrategyType strategy;
    private final Random rng;
    private long timeUntilReshapeMs;
    private boolean alertSent;
    private AlgorithmMetrics lastMetrics;

    public CageReshapeModifier(GameBalanceConfig config, BacktrackingCageGenerator generator, Random rng) {
        this(config, generator, SolverStrategyType.OPTIMIZED_MRV_PRUNING, rng);
    }

    public CageReshapeModifier(
            GameBalanceConfig config, BacktrackingCageGenerator generator, SolverStrategyType strategy, Random rng) {
        if (!config.hasReshape()) {
            throw new IllegalArgumentException("Balance config does not define a reshape interval");
        }
        this.intervalMs = config.reshapeIntervalMs();
        this.alertMs = config.preReshapeAlertMs();
        this.generator = generator;
        this.strategy = strategy;
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
            session.notifyAlertWarning(timeUntilReshapeMs);
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

    public Optional<AlgorithmMetrics> getLastMetrics() {
        return Optional.ofNullable(lastMetrics);
    }

    private void reshape(GameSession session) {
        Board board = session.getBoard();
        CageLayoutResult result = generator.reshapeCages(board, strategy, rng);
        lastMetrics = result.metrics();
        timeUntilReshapeMs = intervalMs;
        alertSent = false;
        if (result.cages().equals(board.getCages())) {
            return;
        }
        board.replaceCages(result.cages());
        session.notifyCagesReshaped(result.cages(), result.metrics());
    }
}
