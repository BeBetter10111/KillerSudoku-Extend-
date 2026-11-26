package com.killer.sudoku.server.handler;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.server.leaderboard.DailyLeaderboard;
import com.killer.sudoku.server.leaderboard.LeaderboardEntry;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class LeaderboardController {

    public record DailySeedResponse(String date, String seed) {
    }

    private final DailyLeaderboard leaderboard;

    public LeaderboardController(DailyLeaderboard leaderboard) {
        this.leaderboard = leaderboard;
    }

    @GetMapping("/daily-seed")
    public DailySeedResponse dailySeed() {
        LocalDate today = leaderboard.today();
        return new DailySeedResponse(today.toString(), leaderboard.dailySeed(today));
    }

    @GetMapping("/leaderboard")
    public List<LeaderboardEntry> leaderboard(
            @RequestParam(name = "date", required = false) String date,
            @RequestParam(name = "mode", required = false) GameMode mode,
            @RequestParam(name = "difficulty", required = false) Difficulty difficulty,
            @RequestParam(name = "limit", defaultValue = "50") int limit) {
        return leaderboard.top(parseDate(date), mode, difficulty, limit);
    }

    private LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) {
            return leaderboard.today();
        }
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date must be formatted as yyyy-MM-dd");
        }
    }
}
