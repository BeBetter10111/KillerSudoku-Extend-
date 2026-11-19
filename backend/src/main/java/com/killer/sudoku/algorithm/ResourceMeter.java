package com.killer.sudoku.algorithm;

import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;

final class ResourceMeter {

    private static final com.sun.management.ThreadMXBean ALLOCATION_BEAN = allocationBean();

    private ResourceMeter() {
    }

    record Reading(long nanos, long bytes) {
    }

    record Measurement(double millis, long bytes) {
    }

    static Reading start() {
        return new Reading(System.nanoTime(), allocatedBytes());
    }

    static Measurement stop(Reading start) {
        long nanos = System.nanoTime() - start.nanos();
        long bytes = Math.max(0, allocatedBytes() - start.bytes());
        return new Measurement(nanos / 1_000_000.0, bytes);
    }

    private static long allocatedBytes() {
        if (ALLOCATION_BEAN != null) {
            return ALLOCATION_BEAN.getThreadAllocatedBytes(Thread.currentThread().getId());
        }
        Runtime runtime = Runtime.getRuntime();
        return runtime.totalMemory() - runtime.freeMemory();
    }

    private static com.sun.management.ThreadMXBean allocationBean() {
        ThreadMXBean bean = ManagementFactory.getThreadMXBean();
        if (bean instanceof com.sun.management.ThreadMXBean sunBean && sunBean.isThreadAllocatedMemorySupported()) {
            if (!sunBean.isThreadAllocatedMemoryEnabled()) {
                sunBean.setThreadAllocatedMemoryEnabled(true);
            }
            return sunBean;
        }
        return null;
    }
}
