package com.killer.sudoku.algorithm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class UnionFindTest {

    @Test
    void countsEveryFindUnionAndRollbackExactly() {
        UnionFind uf = new UnionFind(4);
        assertEquals(0, uf.operationCount());

        int checkpoint = uf.checkpoint();
        assertTrue(uf.union(0, 1));
        assertEquals(3, uf.operationCount());

        assertFalse(uf.union(0, 1));
        assertEquals(6, uf.operationCount());

        uf.find(1);
        assertEquals(7, uf.operationCount());

        uf.rollback(checkpoint);
        assertEquals(8, uf.operationCount());
        assertNotEquals(uf.find(0), uf.find(1));
        assertEquals(10, uf.operationCount());
    }

    @Test
    void rollbackRestoresSeparateComponents() {
        UnionFind uf = new UnionFind(5);
        uf.union(0, 1);
        int checkpoint = uf.checkpoint();
        uf.union(1, 2);
        uf.union(3, 4);
        assertEquals(uf.find(0), uf.find(2));
        uf.rollback(checkpoint);
        assertNotEquals(uf.find(0), uf.find(2));
        assertEquals(uf.find(0), uf.find(1));
        assertNotEquals(uf.find(3), uf.find(4));
    }
}
