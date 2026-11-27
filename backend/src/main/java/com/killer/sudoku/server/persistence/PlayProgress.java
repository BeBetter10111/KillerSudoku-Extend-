package com.killer.sudoku.server.persistence;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "play_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "mode", "difficulty"}))
public class PlayProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GameMode mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Difficulty difficulty;

    @Column(nullable = false)
    private int plays;

    protected PlayProgress() {
    }

    public PlayProgress(Long userId, GameMode mode, Difficulty difficulty) {
        this.userId = userId;
        this.mode = mode;
        this.difficulty = difficulty;
    }

    public GameMode getMode() {
        return mode;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public int getPlays() {
        return plays;
    }

    public void increment() {
        plays++;
    }
}
