package com.killer.sudoku.algorithm;

import java.util.Random;

final class Randoms {

    private Randoms() {
    }

    static void shuffle(int[] values, int length, Random rng) {
        for (int i = length - 1; i > 0; i--) {
            int j = rng.nextInt(i + 1);
            int tmp = values[i];
            values[i] = values[j];
            values[j] = tmp;
        }
    }

    static int weightedIndex(int[] weights, Random rng) {
        int total = 0;
        for (int weight : weights) {
            total += weight;
        }
        if (total <= 0) {
            throw new IllegalArgumentException("At least one weight must be positive");
        }
        int pick = rng.nextInt(total);
        for (int i = 0; i < weights.length; i++) {
            pick -= weights[i];
            if (pick < 0) {
                return i;
            }
        }
        throw new IllegalStateException("Unreachable: weighted pick exceeded total");
    }
}
