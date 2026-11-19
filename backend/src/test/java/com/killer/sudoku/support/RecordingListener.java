package com.killer.sudoku.support;

import com.killer.sudoku.core.GameEventListener;
import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.PlayerHealth;
import com.killer.sudoku.model.Position;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

public class RecordingListener implements GameEventListener {

    public record Event(String type, Object data) {
    }

    public record BotSnapshot(Position position, boolean revealed, boolean active, long remainingMs, long maxMs) {
    }

    public record CellUpdate(Position position, int value, boolean correct) {
    }

    public record GameOver(boolean won, long finalTimeMs, String reason) {
    }

    public final List<Event> events = new CopyOnWriteArrayList<>();
    public final List<AlgorithmMetrics> reshapeMetrics = new CopyOnWriteArrayList<>();
    public final List<Optional<AlgorithmMetrics>> initMetrics = new CopyOnWriteArrayList<>();

    public List<String> types() {
        return events.stream().map(Event::type).toList();
    }

    public long count(String type) {
        return events.stream().filter(event -> event.type().equals(type)).count();
    }

    public Event last(String type) {
        for (int i = events.size() - 1; i >= 0; i--) {
            if (events.get(i).type().equals(type)) {
                return events.get(i);
            }
        }
        throw new AssertionError("No event of type " + type);
    }

    public Event lastEvent() {
        return events.get(events.size() - 1);
    }

    @Override
    public void onInitState(GameSession session, AlgorithmMetrics metrics) {
        initMetrics.add(metrics == null ? Optional.empty() : Optional.of(metrics));
        events.add(new Event("INIT", null));
    }

    @Override
    public void onCellUpdated(Position position, int value, boolean correct) {
        events.add(new Event("CELL", new CellUpdate(position, value, correct)));
    }

    @Override
    public void onHpUpdated(PlayerHealth health) {
        events.add(new Event("HP", health.getCurrentHp()));
    }

    @Override
    public void onBotUpdated(BotEntity bot) {
        events.add(new Event("BOT", new BotSnapshot(
                bot.getPosition(), bot.isRevealed(), bot.isActive(), bot.getRemainingTimeoutMs(), bot.getMaxTimeoutMs())));
    }

    @Override
    public void onAlertWarning(long secondsRemaining) {
        events.add(new Event("ALERT", secondsRemaining));
    }

    @Override
    public void onCagesReshaped(List<Cage> cages, AlgorithmMetrics metrics) {
        reshapeMetrics.add(metrics);
        events.add(new Event("RESHAPED", List.copyOf(new ArrayList<>(cages))));
    }

    @Override
    public void onTick(long elapsedMs, Long botRemainingMs) {
        events.add(new Event("TICK", elapsedMs));
    }

    @Override
    public void onGameOver(boolean won, long finalTimeMs, String reason) {
        events.add(new Event("OVER", new GameOver(won, finalTimeMs, reason)));
    }
}
