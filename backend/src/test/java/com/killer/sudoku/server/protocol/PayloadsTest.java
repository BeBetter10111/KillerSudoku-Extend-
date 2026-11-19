package com.killer.sudoku.server.protocol;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import java.util.List;
import org.junit.jupiter.api.Test;

class PayloadsTest {

    @Test
    void cagesReshapedSerializesCagesAndMetricsWithClientFieldNames() throws Exception {
        Cage cage = new Cage(0, List.of(new Position(0, 0), new Position(0, 1)), 7);
        AlgorithmMetrics metrics = new AlgorithmMetrics(SolverStrategyType.OPTIMIZED_MRV_PRUNING,
                AlgorithmMetrics.CAGE_RESHAPE, 1.25, 120, 40, 300, 4096, true);

        JsonNode json = new ObjectMapper().valueToTree(new Payloads.CagesReshaped(List.of(cage), metrics));

        assertEquals(1, json.get("cages").size());
        assertEquals(7, json.get("cages").get(0).get("targetSum").asInt());
        JsonNode m = json.get("metrics");
        assertEquals("OPTIMIZED_MRV_PRUNING", m.get("strategyUsed").asText());
        assertEquals("CAGE_RESHAPE", m.get("operationType").asText());
        assertEquals(1.25, m.get("executionTimeMs").asDouble());
        assertEquals(120, m.get("nodesVisited").asLong());
        assertEquals(40, m.get("prunedBranches").asLong());
        assertEquals(300, m.get("unionFindOps").asLong());
        assertEquals(4096, m.get("memoryBytes").asLong());
        assertTrue(m.get("oracleVerified").asBoolean());
    }
}
