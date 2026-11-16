package com.killer.sudoku.service;

public class TimerService {

    private long elapsedMs;
    private boolean running;

    public void start() {
        running = true;
    }

    public void stop() {
        running = false;
    }

    public void tick(long deltaMs) {
        if (deltaMs < 0) {
            throw new IllegalArgumentException("deltaMs must not be negative: " + deltaMs);
        }
        if (running) {
            elapsedMs += deltaMs;
        }
    }

    public long getElapsedMs() {
        return elapsedMs;
    }

    public boolean isRunning() {
        return running;
    }
}
