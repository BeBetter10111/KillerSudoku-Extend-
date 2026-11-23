package com.killer.sudoku.server.protocol;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.support.TestSessions;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class BoardStateDTOTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private GameSession started(GameMode mode, Difficulty difficulty) {
        GameSession session = TestSessions.factory().create("dto-session", mode, difficulty, "dto-seed", "Frog");
        session.start();
        return session;
    }

    @Test
    void classicSnapshotHasNoHealthOrBot() {
        BoardStateDTO dto = BoardStateDTO.from(started(GameMode.CLASSIC, Difficulty.EASY));

        assertNull(dto.playerHealth());
        assertNull(dto.bot());
        assertEquals(9, dto.cells().size());
        assertEquals(9, dto.cells().get(0).size());
        assertEquals("dto-seed", dto.seed());
        assertTrue(81 - dto.emptyCellsCount() >= 30);
    }

    @Test
    void botChallengeSnapshotHidesBotPositionAndExposesHealth() {
        GameSession session = started(GameMode.BOT_CHALLENGE, Difficulty.MEDIUM);
        BoardStateDTO dto = BoardStateDTO.from(session);

        assertEquals(100, dto.playerHealth().currentHp());
        assertTrue(dto.bot().active());
        assertFalse(dto.bot().revealed());
        assertNull(dto.bot().position());
    }

    @Test
    void revealedBotExposesPositionAndInactiveBotDoesNot() {
        BotEntity bot = new BotEntity(new Position(3, 4), 30_000);
        assertNull(BoardStateDTO.BotDTO.from(bot).position());

        bot.reveal();
        assertEquals(new Position(3, 4), BoardStateDTO.BotDTO.from(bot).position());

        bot.deactivate();
        BoardStateDTO.BotDTO inactive = BoardStateDTO.BotDTO.from(bot);
        assertFalse(inactive.active());
        assertNull(inactive.position());
    }

    @Test
    void serializedSnapshotMatchesTheFrontendContractAndNeverLeaksSolutions() throws Exception {
        GameSession session = started(GameMode.BOT_CHALLENGE, Difficulty.HARD);
        String json = mapper.writeValueAsString(
                GameEventMessage.of(GameEventType.GAME_STARTED, "dto-session", BoardStateDTO.from(session)));
        JsonNode root = mapper.readTree(json);

        assertEquals("GAME_STARTED", root.get("type").asText());
        assertEquals("dto-session", root.get("sessionId").asText());
        assertTrue(root.has("timestamp"));
        JsonNode payload = root.get("payload");
        assertEquals("BOT_CHALLENGE", payload.get("mode").asText());
        assertEquals("HARD", payload.get("difficulty").asText());
        assertEquals(9, payload.get("cells").size());
        assertEquals(fieldNames(payload.get("cells").get(0).get(0)),
                List.of("row", "col", "currentValue", "given", "solved"));
        assertEquals(List.of("id", "cells", "targetSum"), fieldNames(payload.get("cages").get(0)));
        assertEquals(List.of("maxHp", "currentHp"), fieldNames(payload.get("playerHealth")));
        assertEquals(List.of("active", "revealed", "position", "remainingTimeoutMs", "maxTimeoutMs"),
                fieldNames(payload.get("bot")));
        assertTrue(payload.get("bot").get("position").isNull());
        assertFalse(json.contains("solution"));
    }

    @Test
    void eventPayloadsSerializeWithStableFieldNames() throws Exception {
        assertEquals(List.of("position", "value", "correct"),
                fieldNames(mapper.valueToTree(new Payloads.CellUpdate(new Position(1, 2), 5, true))));
        assertEquals(List.of("secondsRemaining"), fieldNames(mapper.valueToTree(new Payloads.Alert(10))));
        assertEquals(List.of("elapsedMs", "botRemainingMs", "reshapeRemainingMs"),
                fieldNames(mapper.valueToTree(new Payloads.Tick(250, null, null))));
        assertEquals(List.of("won", "finalTimeMs", "reason"),
                fieldNames(mapper.valueToTree(new Payloads.GameOver(true, 1, "COMPLETED"))));
        assertEquals(List.of("message"), fieldNames(mapper.valueToTree(new Payloads.ErrorMessage("x"))));
    }

    private static List<String> fieldNames(JsonNode node) {
        List<String> names = new ArrayList<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }
}
