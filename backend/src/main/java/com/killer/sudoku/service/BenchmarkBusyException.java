package com.killer.sudoku.service;

public class BenchmarkBusyException extends RuntimeException {

    public BenchmarkBusyException() {
        super("A benchmark is already running");
    }
}
