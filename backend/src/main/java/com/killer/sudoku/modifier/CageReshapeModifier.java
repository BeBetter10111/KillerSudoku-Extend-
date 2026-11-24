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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class CageReshapeModifier implements GameModifier {

    private static final Logger log = LoggerFactory.getLogger(CageReshapeModifier.class);
    static final long RETRY_DELAY_MS = 5_000;

    @FunctionalInterface
    interface Reshaper {
        CageLayoutResult reshape(Board board, SolverStrategyType strategy, Random rng);
    }

    private final long intervalMs;
    private final long alertMs;
    private final Reshaper reshaper;
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
        this(config, (board, s, r) -> withSingleCells(generator.reshapeCages(board, s, r), board, r), strategy, rng);
    }

    private static CageLayoutResult withSingleCells(CageLayoutResult result, Board board, Random rng) {
        int[][] solution = new int[Board.SIZE][Board.SIZE];
        for (int row = 0; row < Board.SIZE; row++) {
            for (int col = 0; col < Board.SIZE; col++) {
                solution[row][col] = board.getCell(row, col).getSolutionValue();
            }
        }
        return new CageLayoutResult(
                BacktrackingCageGenerator.withSingleCellCages(result.cages(), solution, rng), result.metrics());
    }

    CageReshapeModifier(GameBalanceConfig config, Reshaper reshaper, SolverStrategyType strategy, Random rng) {
        if (!config.hasReshape()) {
            throw new IllegalArgumentException("Balance config does not define a reshape interval");
        }
        this.intervalMs = config.reshapeIntervalMs();
        this.alertMs = config.preReshapeAlertMs();
        this.reshaper = reshaper;
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
        CageLayoutResult result = reshaper.reshape(board, strategy, rng);
        lastMetrics = result.metrics();
        if (result.cages().equals(board.getCages())) {
            timeUntilReshapeMs = Math.min(intervalMs, RETRY_DELAY_MS);
            alertSent = true;
            log.warn("Session {}: no new unique cage layout found, retrying in {} ms",
                    session.getSessionId(), timeUntilReshapeMs);
            return;
        }
        timeUntilReshapeMs = intervalMs;
        alertSent = false;
        board.replaceCages(result.cages());
        log.info("Session {}: cage layout reshaped into {} cages", session.getSessionId(), result.cages().size());
        session.notifyCagesReshaped(result.cages(), result.metrics());
    }
}
