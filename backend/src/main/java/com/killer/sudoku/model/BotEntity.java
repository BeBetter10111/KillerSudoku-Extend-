package com.killer.sudoku.model;

import lombok.Getter;

@Getter
public class BotEntity {

    private Position position;
    private boolean revealed;
    private long remainingTimeoutMs;
    private long maxTimeoutMs;
    private boolean active;

    public BotEntity(Position position, long maxTimeoutMs) {
        requirePositiveTimeout(maxTimeoutMs);
        this.position = requirePosition(position);
        this.maxTimeoutMs = maxTimeoutMs;
        this.remainingTimeoutMs = maxTimeoutMs;
        this.revealed = false;
        this.active = true;
    }

    public void relocate(Position newPosition, long newMaxTimeoutMs) {
        requirePositiveTimeout(newMaxTimeoutMs);
        this.position = requirePosition(newPosition);
        this.maxTimeoutMs = newMaxTimeoutMs;
        this.remainingTimeoutMs = newMaxTimeoutMs;
    }

    public void reveal() {
        this.revealed = true;
    }

    public void hide() {
        this.revealed = false;
    }

    public void consumeTimeout(long elapsedMs) {
        if (elapsedMs < 0) {
            throw new IllegalArgumentException("elapsedMs must not be negative: " + elapsedMs);
        }
        this.remainingTimeoutMs = Math.max(0, remainingTimeoutMs - elapsedMs);
    }

    public boolean isExpired() {
        return remainingTimeoutMs <= 0;
    }

    public void deactivate() {
        this.active = false;
        this.revealed = false;
    }

    private static Position requirePosition(Position position) {
        if (position == null) {
            throw new IllegalArgumentException("Bot position must not be null");
        }
        return position;
    }

    private static void requirePositiveTimeout(long timeoutMs) {
        if (timeoutMs <= 0) {
            throw new IllegalArgumentException("Timeout must be positive: " + timeoutMs);
        }
    }
}
