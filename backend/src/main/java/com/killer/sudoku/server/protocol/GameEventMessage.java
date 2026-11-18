package com.killer.sudoku.server.protocol;

import com.killer.sudoku.model.AlgorithmMetrics;

public record GameEventMessage<T>(
        GameEventType type, String sessionId, long timestamp, T payload, AlgorithmMetrics metrics) {

    public static <T> GameEventMessage<T> of(GameEventType type, String sessionId, T payload) {
        return of(type, sessionId, payload, null);
    }

    public static <T> GameEventMessage<T> of(
            GameEventType type, String sessionId, T payload, AlgorithmMetrics metrics) {
        return new GameEventMessage<>(type, sessionId, System.currentTimeMillis(), payload, metrics);
    }
}
