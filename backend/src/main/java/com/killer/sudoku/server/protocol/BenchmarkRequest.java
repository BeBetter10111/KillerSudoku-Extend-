package com.killer.sudoku.server.protocol;

import com.killer.sudoku.model.Difficulty;

public record BenchmarkRequest(Difficulty difficulty, Integer batchSize, String seedPrefix) {
}
