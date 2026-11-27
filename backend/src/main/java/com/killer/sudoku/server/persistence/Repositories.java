package com.killer.sudoku.server.persistence;

import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import java.util.List;
import java.util.Optional;

public final class Repositories {

    private Repositories() {
    }

    public interface UserRepository extends org.springframework.data.jpa.repository.JpaRepository<UserAccount, Long> {
        Optional<UserAccount> findByUsernameKey(String usernameKey);
    }

    public interface TokenRepository extends org.springframework.data.jpa.repository.JpaRepository<AuthToken, String> {
    }

    public interface ProgressRepository
            extends org.springframework.data.jpa.repository.JpaRepository<PlayProgress, Long> {
        List<PlayProgress> findByUserId(Long userId);

        Optional<PlayProgress> findByUserIdAndModeAndDifficulty(Long userId, GameMode mode, Difficulty difficulty);
    }

    public interface SavedGameRepository
            extends org.springframework.data.jpa.repository.JpaRepository<SavedGame, Long> {
    }
}
