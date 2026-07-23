package com.killer.sudoku.service;

import com.killer.sudoku.model.event.DomainEvent;
import java.util.List;

public class WebSocketGameNotificationService implements GameNotificationService {
    @Override
    public void publish(String sessionId, List<DomainEvent> events) {
        // Placeholder: push events over WebSocket
    }
}
