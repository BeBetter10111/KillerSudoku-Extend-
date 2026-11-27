package com.killer.sudoku.server.persistence;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.SolverStrategyType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** The single in-progress game of a player: seed + move log is enough to rebuild it deterministically. */
@Entity
@Table(name = "saved_game")
public class SavedGame {

    @Id
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GameMode mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Difficulty difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private SolverStrategyType solverStrategy;

    @Column(nullable = false, length = 64)
    private String seed;

    @Column(nullable = false)
    private long elapsedMs;

    @Column(nullable = false, columnDefinition = "text")
    private String movesJson;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected SavedGame() {
    }

    public SavedGame(Long userId) {
        this.userId = userId;
    }

    public void update(GameMode mode, Difficulty difficulty, SolverStrategyType solver, String seed,
            long elapsedMs, String movesJson) {
        this.mode = mode;
        this.difficulty = difficulty;
        this.solverStrategy = solver;
        this.seed = seed;
        this.elapsedMs = elapsedMs;
        this.movesJson = movesJson;
        this.updatedAt = Instant.now();
    }

    public Long getUserId() {
        return userId;
    }

    public GameMode getMode() {
        return mode;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public SolverStrategyType getSolverStrategy() {
        return solverStrategy;
    }

    public String getSeed() {
        return seed;
    }

    public long getElapsedMs() {
        return elapsedMs;
    }

    public String getMovesJson() {
        return movesJson;
    }
}
