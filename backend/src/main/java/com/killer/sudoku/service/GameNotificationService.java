package com.killer.sudoku.service;

import com.killer.sudoku.model.event.DomainEvent;
import java.util.List;

public interface GameNotificationService {
    void publish(String sessionId, List<DomainEvent> events);
}
