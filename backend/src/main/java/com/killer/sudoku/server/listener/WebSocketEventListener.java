package com.killer.sudoku.server.listener;

import com.killer.sudoku.core.GameEventListener;
import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.PlayerHealth;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.server.protocol.BoardStateDTO;
import com.killer.sudoku.server.protocol.GameEventMessage;
import com.killer.sudoku.server.protocol.GameEventType;
import com.killer.sudoku.server.protocol.Payloads;
import java.util.List;
import org.springframework.messaging.simp.SimpMessagingTemplate;

public final class WebSocketEventListener implements GameEventListener {

    private static final String TOPIC_PREFIX = "/topic/game/";

    private final String sessionId;
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketEventListener(String sessionId, SimpMessagingTemplate messagingTemplate) {
        this.sessionId = sessionId;
        this.messagingTemplate = messagingTemplate;
    }

    public static String destination(String sessionId) {
        return TOPIC_PREFIX + sessionId;
    }

    @Override
    public void onInitState(GameSession session, AlgorithmMetrics metrics) {
        send(GameEventType.GAME_STARTED, BoardStateDTO.from(session), metrics);
    }

    @Override
    public void onCellUpdated(Position position, int value, boolean correct) {
        GameEventType type = correct ? GameEventType.CELL_UPDATED : GameEventType.MOVE_REJECTED;
        send(type, new Payloads.CellUpdate(position, value, correct));
    }

    @Override
    public void onHpUpdated(PlayerHealth health) {
        send(GameEventType.HP_CHANGED, BoardStateDTO.PlayerHealthDTO.from(health));
    }

    @Override
    public void onBotUpdated(BotEntity bot) {
        send(GameEventType.BOT_UPDATED, BoardStateDTO.BotDTO.from(bot));
    }

    @Override
    public void onAlertWarning(long secondsRemaining) {
        send(GameEventType.ALERT_WARNING, new Payloads.Alert(secondsRemaining));
    }

    @Override
    public void onCagesReshaped(List<Cage> cages, AlgorithmMetrics metrics) {
        send(GameEventType.CAGE_RESHAPED, new Payloads.CagesReshaped(cages, metrics), metrics);
    }

    @Override
    public void onTick(long elapsedMs, Long botRemainingMs, Long reshapeRemainingMs) {
        send(GameEventType.TICK, new Payloads.Tick(elapsedMs, botRemainingMs, reshapeRemainingMs));
    }

    @Override
    public void onGameOver(boolean won, long finalTimeMs, String reason) {
        GameEventType type = won ? GameEventType.GAME_WON : GameEventType.GAME_LOST;
        send(type, new Payloads.GameOver(won, finalTimeMs, reason));
    }

    private void send(GameEventType type, Object payload) {
        send(type, payload, null);
    }

    private void send(GameEventType type, Object payload, AlgorithmMetrics metrics) {
        messagingTemplate.convertAndSend(destination(sessionId), GameEventMessage.of(type, sessionId, payload, metrics));
    }
}
