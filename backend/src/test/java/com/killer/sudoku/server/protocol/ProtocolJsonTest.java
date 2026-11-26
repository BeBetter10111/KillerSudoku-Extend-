package com.killer.sudoku.server.protocol;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.killer.sudoku.model.AlgorithmMetrics;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.SolverStrategyType;
import org.junit.jupiter.api.Test;

class ProtocolJsonTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void startRequestAcceptsSolverStrategyAndStaysCompatibleWithOldClients() throws Exception {
        StartGameRequest withStrategy = mapper.readValue(
                "{\"mode\":\"BOT_CHALLENGE\",\"difficulty\":\"HARD\",\"seed\":\"s\",\"playerName\":\"Frog\","
                        + "\"solverStrategy\":\"NAIVE_ORACLE\"}",
                StartGameRequest.class);
        assertEquals(GameMode.BOT_CHALLENGE, withStrategy.mode());
        assertEquals(Difficulty.HARD, withStrategy.difficulty());
        assertEquals(SolverStrategyType.NAIVE_ORACLE, withStrategy.solverStrategy());

        StartGameRequest legacy =
                mapper.readValue("{\"mode\":\"CLASSIC\",\"difficulty\":\"EASY\"}", StartGameRequest.class);
        assertNull(legacy.solverStrategy());
        assertNull(legacy.seed());
    }

    @Test
    void benchmarkRequestParsesOptionalFields() throws Exception {
        BenchmarkRequest full = mapper.readValue(
                "{\"difficulty\":\"MEDIUM\",\"batchSize\":500,\"seedPrefix\":\"run-1\"}", BenchmarkRequest.class);
        assertEquals(Difficulty.MEDIUM, full.difficulty());
        assertEquals(500, full.batchSize());
        assertEquals("run-1", full.seedPrefix());

        BenchmarkRequest minimal = mapper.readValue("{\"difficulty\":\"EASY\"}", BenchmarkRequest.class);
        assertNull(minimal.batchSize());
        assertNull(minimal.seedPrefix());
    }

    @Test
    void eventMessageCarriesMetricsWhenPresentAndNullOtherwise() {
        AlgorithmMetrics metrics = new AlgorithmMetrics(SolverStrategyType.OPTIMIZED_MRV_PRUNING,
                AlgorithmMetrics.PUZZLE_GEN, 1.5, 60, 20, 280, 32_768, true);

        JsonNode withMetrics =
                mapper.valueToTree(GameEventMessage.of(GameEventType.GAME_STARTED, "sid", "payload", metrics));
        assertEquals("GAME_STARTED", withMetrics.get("type").asText());
        assertEquals("sid", withMetrics.get("sessionId").asText());
        assertEquals("PUZZLE_GEN", withMetrics.get("metrics").get("operationType").asText());
        assertEquals(60, withMetrics.get("metrics").get("nodesVisited").asLong());
        assertTrue(withMetrics.get("metrics").get("oracleVerified").asBoolean());

        JsonNode without = mapper.valueToTree(GameEventMessage.of(GameEventType.TICK, "sid", 1));
        assertTrue(without.get("metrics").isNull());
        assertTrue(without.get("timestamp").asLong() > 0);
    }
}
