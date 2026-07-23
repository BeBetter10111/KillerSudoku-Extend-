package com.killer.sudoku.service;

public class RedisDistributedLockService implements DistributedLockService {
    @Override
    public boolean tryLock(String key) {
        return true;
    }

    @Override
    public void unlock(String key) {
        // Placeholder: release Redis lock
    }
}
