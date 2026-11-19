package com.killer.sudoku.algorithm;

final class UnionFind {

    private final int[] parent;
    private final int[] size;
    private final int[] history;
    private int historySize;
    private long operations;

    UnionFind(int capacity) {
        parent = new int[capacity];
        size = new int[capacity];
        history = new int[capacity];
        for (int i = 0; i < capacity; i++) {
            parent[i] = i;
            size[i] = 1;
        }
    }

    int find(int x) {
        operations++;
        while (parent[x] != x) {
            x = parent[x];
        }
        return x;
    }

    boolean union(int a, int b) {
        operations++;
        int rootA = find(a);
        int rootB = find(b);
        if (rootA == rootB) {
            return false;
        }
        if (size[rootA] < size[rootB]) {
            int tmp = rootA;
            rootA = rootB;
            rootB = tmp;
        }
        parent[rootB] = rootA;
        size[rootA] += size[rootB];
        history[historySize++] = rootB;
        return true;
    }

    long operationCount() {
        return operations;
    }

    int checkpoint() {
        return historySize;
    }

    void rollback(int checkpoint) {
        while (historySize > checkpoint) {
            operations++;
            int child = history[--historySize];
            int root = parent[child];
            size[root] -= size[child];
            parent[child] = child;
        }
    }
}
