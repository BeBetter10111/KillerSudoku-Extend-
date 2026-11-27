package com.killer.sudoku.server.account;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.server.persistence.PlayProgress;
import com.killer.sudoku.server.persistence.Repositories.ProgressRepository;
import java.util.EnumMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProgressService {

    private final ProgressRepository repository;

    public ProgressService(ProgressRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Map<GameMode, Map<Difficulty, Integer>> counts(Long userId) {
        Map<GameMode, Map<Difficulty, Integer>> result = new EnumMap<>(GameMode.class);
        for (GameMode mode : GameMode.values()) {
            Map<Difficulty, Integer> levels = new EnumMap<>(Difficulty.class);
            for (Difficulty difficulty : Difficulty.values()) {
                levels.put(difficulty, 0);
            }
            result.put(mode, levels);
        }
        for (PlayProgress row : repository.findByUserId(userId)) {
            result.get(row.getMode()).put(row.getDifficulty(), row.getPlays());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public boolean isUnlocked(Long userId, GameMode mode, Difficulty difficulty) {
        Difficulty previous = LevelProgression.previous(difficulty);
        if (previous == null) {
            return true;
        }
        int plays = repository.findByUserIdAndModeAndDifficulty(userId, mode, previous)
                .map(PlayProgress::getPlays)
                .orElse(0);
        return LevelProgression.isUnlocked(difficulty, plays);
    }

    @Transactional
    public void recordPlay(Long userId, GameMode mode, Difficulty difficulty) {
        PlayProgress row = repository.findByUserIdAndModeAndDifficulty(userId, mode, difficulty)
                .orElseGet(() -> new PlayProgress(userId, mode, difficulty));
        row.increment();
        repository.save(row);
    }
}
