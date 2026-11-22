package com.killer.sudoku.core;

import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.config.GameBalanceConfig;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.PlayerHealth;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import com.killer.sudoku.modifier.CageReshapeModifier;
import com.killer.sudoku.modifier.GameModifier;
import com.killer.sudoku.service.TimerService;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class GameSession {

    public static final long TICK_MS = 250;
    public static final long WRONG_ANSWER_PENALTY_MS = 5_000;
    public static final String REASON_COMPLETED = "COMPLETED";
    public static final String REASON_HP_DEPLETED = "HP_DEPLETED";
    public static final String REASON_FORFEIT = "FORFEIT";

    private static final Logger log = LoggerFactory.getLogger(GameSession.class);

    private final String sessionId;
    private final GameMode gameMode;
    private final Difficulty difficulty;
    private final SolverStrategyType solverStrategy;
    private final String seed;
    private final String playerName;
    private final int wrongAnswerPenalty;
    private final Board board;
    private final PlayerHealth playerHealth;
    private final TimerService timer;
    private final List<GameModifier> modifiers;
    private final List<GameEventListener> listeners = new CopyOnWriteArrayList<>();
    private final List<MoveRecord> replayLog = new ArrayList<>();

    private AlgorithmMetrics latestMetrics;
    private BotEntity bot;
    private long penaltyMs;
    private boolean started;
    private boolean initializing;
    private boolean finished;
    private boolean won;
    private long finalTimeMs;
    private String endReason;

    public GameSession(
            String sessionId,
            GameMode gameMode,
            Difficulty difficulty,
            String seed,
            String playerName,
            Board board,
            PlayerHealth playerHealth,
            TimerService timer,
            List<GameModifier> modifiers) {
        this(sessionId, gameMode, difficulty, SolverStrategyType.OPTIMIZED_MRV_PRUNING, seed, playerName, board,
                playerHealth, timer, modifiers, null);
    }

    public GameSession(
            String sessionId,
            GameMode gameMode,
            Difficulty difficulty,
            SolverStrategyType solverStrategy,
            String seed,
            String playerName,
            Board board,
            PlayerHealth playerHealth,
            TimerService timer,
            List<GameModifier> modifiers,
            AlgorithmMetrics initialMetrics) {
        this.sessionId = sessionId;
        this.gameMode = gameMode;
        this.difficulty = difficulty;
        this.solverStrategy = solverStrategy;
        this.seed = seed;
        this.playerName = playerName;
        this.wrongAnswerPenalty = GameBalanceConfig.wrongAnswerPenalty(gameMode, difficulty);
        this.board = board;
        this.playerHealth = playerHealth;
        this.timer = timer;
        this.modifiers = List.copyOf(modifiers);
        this.latestMetrics = initialMetrics;
    }

    public void addListener(GameEventListener listener) {
        listeners.add(listener);
    }

    public synchronized void start() {
        if (started) {
            return;
        }
        started = true;
        initializing = true;
        try {
            for (GameModifier modifier : modifiers) {
                modifier.onInit(this);
            }
        } finally {
            initializing = false;
        }
        timer.start();
        AlgorithmMetrics metrics = latestMetrics;
        dispatch(listener -> listener.onInitState(this, metrics));
    }

    public synchronized void tick(long deltaMs) {
        if (!started || finished) {
            return;
        }
        timer.tick(deltaMs);
        for (GameModifier modifier : modifiers) {
            if (modifier.isActive()) {
                modifier.onTick(this, deltaMs);
            }
        }
        if (playerHealth.isDead()) {
            finish(false, REASON_HP_DEPLETED);
            return;
        }
        long totalMs = getTotalTimeMs();
        Long botRemainingMs = bot != null && bot.isActive() && bot.isRevealed() ? bot.getRemainingTimeoutMs() : null;
        Long reshapeRemainingMs = reshapeRemainingMs();
        dispatch(listener -> listener.onTick(totalMs, botRemainingMs, reshapeRemainingMs));
    }

    private Long reshapeRemainingMs() {
        for (GameModifier modifier : modifiers) {
            if (modifier instanceof CageReshapeModifier reshape && reshape.isActive()) {
                return Math.max(0, reshape.getTimeUntilReshapeMs());
            }
        }
        return null;
    }

    public synchronized MoveResult submitValue(Position position, int value) {
        if (!started || finished || value < 1 || value > Board.SIZE) {
            return MoveResult.REJECTED;
        }
        Cell cell = board.getCell(position);
        if (cell.isGiven() || cell.isSolved() || (!cell.isEmpty() && cell.getCurrentValue() == value)) {
            return MoveResult.REJECTED;
        }
        boolean correct = value == cell.getSolutionValue();
        replayLog.add(new MoveRecord(position, value, timer.getElapsedMs(), correct));
        cell.place(value);
        if (!correct) {
            penaltyMs += WRONG_ANSWER_PENALTY_MS;
            playerHealth.deductHp(wrongAnswerPenalty);
            dispatch(listener -> listener.onCellUpdated(position, value, false));
            notifyHpUpdated();
            if (playerHealth.isDead()) {
                finish(false, REASON_HP_DEPLETED);
            }
            return MoveResult.INCORRECT;
        }
        dispatch(listener -> listener.onCellUpdated(position, value, true));
        for (GameModifier modifier : modifiers) {
            if (modifier.isActive()) {
                modifier.onCorrectAnswer(this, position);
            }
        }
        if (board.isComplete()) {
            finish(true, REASON_COMPLETED);
        }
        return MoveResult.CORRECT;
    }

    public synchronized void forfeit(String reason) {
        if (started && !finished) {
            finish(false, reason);
        }
    }

    public synchronized void notifyBotUpdated(BotEntity updated) {
        bot = updated;
        if (!initializing) {
            dispatch(listener -> listener.onBotUpdated(updated));
        }
    }

    public synchronized void notifyHpUpdated() {
        if (!initializing) {
            dispatch(listener -> listener.onHpUpdated(playerHealth));
        }
    }

    public synchronized void notifyAlertWarning(long remainingMs) {
        long seconds = (Math.max(0, remainingMs) + 999) / 1000;
        dispatch(listener -> listener.onAlertWarning(seconds));
    }

    public synchronized void notifyCagesReshaped(List<Cage> cages, AlgorithmMetrics metrics) {
        latestMetrics = metrics;
        dispatch(listener -> listener.onCagesReshaped(cages, metrics));
    }

    public String getSessionId() {
        return sessionId;
    }

    public GameMode getGameMode() {
        return gameMode;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public SolverStrategyType getSolverStrategy() {
        return solverStrategy;
    }

    public synchronized Optional<AlgorithmMetrics> getLatestMetrics() {
        return Optional.ofNullable(latestMetrics);
    }

    public String getSeed() {
        return seed;
    }

    public String getPlayerName() {
        return playerName;
    }

    public int getWrongAnswerPenalty() {
        return wrongAnswerPenalty;
    }

    public Board getBoard() {
        return board;
    }

    public PlayerHealth getPlayerHealth() {
        return playerHealth;
    }

    public synchronized Optional<BotEntity> getBot() {
        return Optional.ofNullable(bot);
    }

    public synchronized long getElapsedMs() {
        return timer.getElapsedMs();
    }

    public synchronized long getPenaltyMs() {
        return penaltyMs;
    }

    public synchronized long getTotalTimeMs() {
        return timer.getElapsedMs() + penaltyMs;
    }

    public synchronized boolean isStarted() {
        return started;
    }

    public synchronized boolean isFinished() {
        return finished;
    }

    public synchronized boolean isWon() {
        return won;
    }

    public synchronized long getFinalTimeMs() {
        return finalTimeMs;
    }

    public synchronized String getEndReason() {
        return endReason;
    }

    public synchronized List<MoveRecord> getReplayLog() {
        return List.copyOf(replayLog);
    }

    private void finish(boolean victory, String reason) {
        if (finished) {
            return;
        }
        finished = true;
        won = victory;
        endReason = reason;
        timer.stop();
        finalTimeMs = timer.getElapsedMs() + penaltyMs;
        long finalMs = finalTimeMs;
        dispatch(listener -> listener.onGameOver(victory, finalMs, reason));
    }

    private void dispatch(Consumer<GameEventListener> action) {
        for (GameEventListener listener : listeners) {
            try {
                action.accept(listener);
            } catch (RuntimeException e) {
                log.warn("Listener failed for session {}", sessionId, e);
            }
        }
    }
}
