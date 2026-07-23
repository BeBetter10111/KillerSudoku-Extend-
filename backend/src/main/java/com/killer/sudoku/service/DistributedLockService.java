package com.killer.sudoku.service;

public interface DistributedLockService {
    boolean tryLock(String key);

    void unlock(String key);
}
