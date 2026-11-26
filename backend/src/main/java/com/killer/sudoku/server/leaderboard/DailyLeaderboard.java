package com.killer.sudoku.server.leaderboard;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class DailyLeaderboard {

    private static final String SEED_PREFIX = "daily-";
    private static final int MAX_ENTRIES_PER_BOARD = 100;
    private static final int RETENTION_DAYS = 7;
    private static final Comparator<LeaderboardEntry> RANKING =
            Comparator.comparingLong(LeaderboardEntry::finalTimeMs).thenComparing(LeaderboardEntry::completedAt);

    private record BoardKey(LocalDate date, GameMode mode, Difficulty difficulty) {
    }

    private final Clock clock;
    private final Map<BoardKey, List<LeaderboardEntry>> boards = new HashMap<>();

    public DailyLeaderboard(Clock clock) {
        this.clock = clock;
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    public String dailySeed(LocalDate date) {
        return SEED_PREFIX + date;
    }

    public Optional<LocalDate> dailyDateOf(String seed) {
        if (seed == null || !seed.startsWith(SEED_PREFIX)) {
            return Optional.empty();
        }
        try {
            LocalDate date = LocalDate.parse(seed.substring(SEED_PREFIX.length()));
            return dailySeed(date).equals(seed) ? Optional.of(date) : Optional.empty();
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }

    public boolean accepts(LocalDate date) {
        LocalDate today = today();
        return !date.isBefore(today.minusDays(1)) && !date.isAfter(today);
    }

    public synchronized boolean submit(
            String playerName, GameMode mode, Difficulty difficulty, LocalDate date, long finalTimeMs) {
        boards.keySet().removeIf(key -> key.date().isBefore(today().minusDays(RETENTION_DAYS)));
        List<LeaderboardEntry> board = boards.computeIfAbsent(new BoardKey(date, mode, difficulty), key -> new ArrayList<>());
        Optional<LeaderboardEntry> existing = board.stream()
                .filter(entry -> entry.playerName().equalsIgnoreCase(playerName))
                .findFirst();
        if (existing.isPresent()) {
            if (existing.get().finalTimeMs() <= finalTimeMs) {
                return false;
            }
            board.remove(existing.get());
        }
        board.add(new LeaderboardEntry(playerName, finalTimeMs, mode, difficulty, date, Instant.now(clock)));
        board.sort(RANKING);
        while (board.size() > MAX_ENTRIES_PER_BOARD) {
            board.remove(board.size() - 1);
        }
        return board.stream().anyMatch(entry -> entry.playerName().equalsIgnoreCase(playerName));
    }

    public synchronized List<LeaderboardEntry> top(LocalDate date, GameMode mode, Difficulty difficulty, int limit) {
        int cap = Math.max(1, Math.min(limit, MAX_ENTRIES_PER_BOARD));
        List<LeaderboardEntry> matches = new ArrayList<>();
        for (Map.Entry<BoardKey, List<LeaderboardEntry>> board : boards.entrySet()) {
            BoardKey key = board.getKey();
            if (key.date().equals(date)
                    && (mode == null || key.mode() == mode)
                    && (difficulty == null || key.difficulty() == difficulty)) {
                matches.addAll(board.getValue());
            }
        }
        matches.sort(RANKING);
        return List.copyOf(matches.subList(0, Math.min(cap, matches.size())));
    }
}
