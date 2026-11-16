package com.killer.sudoku.modifier;

import com.killer.sudoku.algorithm.WeightedRandomBotStrategy;
import com.killer.sudoku.config.GameBalanceConfig;
import com.killer.sudoku.event.BotEventPayload;
import com.killer.sudoku.event.GameEventType;
import com.killer.sudoku.event.HpChangedPayload;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.PlayerHealth;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.service.GameSession;
import java.util.Optional;
import java.util.Random;

public final class BotModifier implements GameModifier {

    private static final int MIN_EMPTY_CELLS = 2;

    private final GameBalanceConfig config;
    private final WeightedRandomBotStrategy strategy;
    private final Random rng;
    private BotEntity bot;
    private int consecutiveReveals;
    private boolean active = true;

    public BotModifier(GameBalanceConfig config, WeightedRandomBotStrategy strategy, Random rng) {
        this.config = config;
        this.strategy = strategy;
        this.rng = rng;
    }

    @Override
    public void onInit(GameSession session) {
        Board board = session.getBoard();
        if (board.getEmptyCellsCount() < MIN_EMPTY_CELLS) {
            active = false;
            return;
        }
        Position start = strategy.selectNext(board, null, rng).orElseThrow();
        bot = new BotEntity(start, config.initialBotTimeoutMs());
        session.publish(GameEventType.BOT_SPAWNED, BotEventPayload.hidden(config.initialBotTimeoutMs()));
    }

    @Override
    public void onCorrectAnswer(GameSession session, Position pos) {
        if (!active || bot == null) {
            return;
        }
        Board board = session.getBoard();
        if (board.getEmptyCellsCount() < MIN_EMPTY_CELLS) {
            deactivate(session);
            return;
        }
        if (!pos.equals(bot.getPosition())) {
            return;
        }
        long timeoutMs = timeoutForReveal(consecutiveReveals);
        consecutiveReveals++;
        Position next = strategy.selectNext(board, pos, rng).orElseThrow();
        bot.reveal();
        bot.relocate(next, timeoutMs);
        session.publish(GameEventType.BOT_REVEALED, new BotEventPayload(next, timeoutMs, timeoutMs));
    }

    @Override
    public void onTick(GameSession session, long deltaMs) {
        if (!active || bot == null || !bot.isRevealed()) {
            return;
        }
        bot.consumeTimeout(deltaMs);
        if (!bot.isExpired()) {
            return;
        }
        PlayerHealth health = session.getPlayerHealth();
        health.deductHp(config.hpPenalty());
        consecutiveReveals = 0;
        session.publish(GameEventType.BOT_TIMEOUT, new BotEventPayload(bot.getPosition(), 0, bot.getMaxTimeoutMs()));
        session.publish(GameEventType.HP_CHANGED,
                new HpChangedPayload(health.getCurrentHp(), health.getMaxHp(), -config.hpPenalty()));
        Board board = session.getBoard();
        if (health.isDead() || board.getEmptyCellsCount() < MIN_EMPTY_CELLS) {
            deactivate(session);
            return;
        }
        Position next = strategy.selectNext(board, bot.getPosition(), rng).orElseThrow();
        bot.hide();
        bot.relocate(next, config.initialBotTimeoutMs());
        session.publish(GameEventType.BOT_SPAWNED, BotEventPayload.hidden(config.initialBotTimeoutMs()));
    }

    @Override
    public boolean isActive() {
        return active;
    }

    public Optional<BotEntity> getBot() {
        return Optional.ofNullable(bot);
    }

    private long timeoutForReveal(int priorConsecutiveReveals) {
        double scaled = config.initialBotTimeoutMs() * Math.pow(1.0 - config.timeoutDecay(), priorConsecutiveReveals);
        return Math.max(config.minBotTimeoutMs(), Math.round(scaled));
    }

    private void deactivate(GameSession session) {
        active = false;
        bot.deactivate();
        session.publish(GameEventType.BOT_DEACTIVATED, BotEventPayload.hidden(config.initialBotTimeoutMs()));
    }
}
