package com.killer.sudoku.algorithm;

import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Cage;
import java.util.List;

public record CageLayoutResult(List<Cage> cages, AlgorithmMetrics metrics) {
}
