package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.Position;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

public final class WeightedRandomBotStrategy {

    public Optional<Position> selectNext(Board board, Position justSolved, Random rng) {
        return selectNext(board.getEmptyCells(), justSolved, rng);
    }

    public Optional<Position> selectNext(List<Position> emptyCells, Position justSolved, Random rng) {
        if (emptyCells.isEmpty()) {
            return Optional.empty();
        }
        List<Position> candidates = new ArrayList<>(emptyCells.size());
        for (Position position : emptyCells) {
            if (!position.equals(justSolved)) {
                candidates.add(position);
            }
        }
        if (candidates.isEmpty()) {
            return Optional.of(emptyCells.get(0));
        }
        int[] weights = new int[candidates.size()];
        for (int i = 0; i < weights.length; i++) {
            weights[i] = weight(candidates.get(i), justSolved);
        }
        return Optional.of(candidates.get(Randoms.weightedIndex(weights, rng)));
    }

    private static int weight(Position candidate, Position justSolved) {
        if (justSolved == null) {
            return 1;
        }
        return 1 + Math.abs(candidate.row() - justSolved.row()) + Math.abs(candidate.col() - justSolved.col());
    }
}
