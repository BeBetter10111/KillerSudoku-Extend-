package com.killer.sudoku.server.leaderboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class DailyLeaderboardTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 15);

    private final DailyLeaderboard leaderboard =
            new DailyLeaderboard(Clock.fixed(Instant.parse("2026-11-15T10:00:00Z"), ZoneOffset.UTC));

    @Test
    void dailySeedRoundTripsAndRejectsLookalikes() {
        assertEquals("daily-2026-11-15", leaderboard.dailySeed(TODAY));
        assertEquals(TODAY, leaderboard.today());
        assertEquals(Optional.of(TODAY), leaderboard.dailyDateOf("daily-2026-11-15"));
        assertTrue(leaderboard.dailyDateOf("daily-2026-13-45").isEmpty());
        assertTrue(leaderboard.dailyDateOf("daily-2026-1-5").isEmpty());
        assertTrue(leaderboard.dailyDateOf("my-seed").isEmpty());
        assertTrue(leaderboard.dailyDateOf(null).isEmpty());
    }

    @Test
    void acceptsOnlyTodayAndYesterday() {
        assertTrue(leaderboard.accepts(TODAY));
        assertTrue(leaderboard.accepts(TODAY.minusDays(1)));
        assertFalse(leaderboard.accepts(TODAY.minusDays(2)));
        assertFalse(leaderboard.accepts(TODAY.plusDays(1)));
    }

    @Test
    void ranksByTimeAndKeepsBestResultPerPlayer() {
        leaderboard.submit("Frog", GameMode.CLASSIC, Difficulty.MEDIUM, TODAY, 300_000);
        leaderboard.submit("Toad", GameMode.CLASSIC, Difficulty.MEDIUM, TODAY, 250_000);
        assertFalse(leaderboard.submit("frog", GameMode.CLASSIC, Difficulty.MEDIUM, TODAY, 400_000));
        assertTrue(leaderboard.submit("FROG", GameMode.CLASSIC, Difficulty.MEDIUM, TODAY, 200_000));

        List<LeaderboardEntry> top = leaderboard.top(TODAY, GameMode.CLASSIC, Difficulty.MEDIUM, 10);

        assertEquals(2, top.size());
        assertEquals("FROG", top.get(0).playerName());
        assertEquals(200_000, top.get(0).finalTimeMs());
        assertEquals("Toad", top.get(1).playerName());
    }

    @Test
    void separatesBoardsByModeAndDifficultyAndFiltersOptionally() {
        leaderboard.submit("A", GameMode.CLASSIC, Difficulty.EASY, TODAY, 100);
        leaderboard.submit("B", GameMode.BOT_CHALLENGE, Difficulty.EASY, TODAY, 90);
        leaderboard.submit("C", GameMode.CLASSIC, Difficulty.HARD, TODAY, 80);

        assertEquals(1, leaderboard.top(TODAY, GameMode.CLASSIC, Difficulty.EASY, 10).size());
        assertEquals(2, leaderboard.top(TODAY, null, Difficulty.EASY, 10).size());
        assertEquals(3, leaderboard.top(TODAY, null, null, 10).size());
        assertEquals("C", leaderboard.top(TODAY, null, null, 10).get(0).playerName());
        assertTrue(leaderboard.top(TODAY.minusDays(1), null, null, 10).isEmpty());
    }

    @Test
    void capsResultsAndClampsLimit() {
        for (int i = 0; i < 130; i++) {
            leaderboard.submit("p" + i, GameMode.CLASSIC, Difficulty.EASY, TODAY, 1_000 + i);
        }
        assertEquals(100, leaderboard.top(TODAY, null, null, 1_000).size());
        assertEquals(1, leaderboard.top(TODAY, null, null, 0).size());
        assertEquals("p0", leaderboard.top(TODAY, null, null, 5).get(0).playerName());
    }
}
