package com.killer.sudoku.server.account;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.core.GameSessionFactory;
import com.killer.sudoku.core.MoveRecord;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.server.persistence.Repositories.SavedGameRepository;
import com.killer.sudoku.server.persistence.SavedGame;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedGameService {

    public record Summary(GameMode mode, Difficulty difficulty, long elapsedMs, String solverStrategy) {
    }

    private static final TypeReference<List<MoveRecord>> MOVES = new TypeReference<>() {
    };

    private final SavedGameRepository repository;
    private final GameSessionFactory sessionFactory;
    private final ObjectMapper mapper;

    public SavedGameService(SavedGameRepository repository, GameSessionFactory sessionFactory, ObjectMapper mapper) {
        this.repository = repository;
        this.sessionFactory = sessionFactory;
        this.mapper = mapper;
    }

    @Transactional
    public void save(Long userId, GameSession session) {
        if (session.isFinished()) {
            return;
        }
        String moves;
        try {
            moves = mapper.writeValueAsString(session.getReplayLog());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialise moves", e);
        }
        SavedGame saved = repository.findById(userId).orElseGet(() -> new SavedGame(userId));
        saved.update(session.getGameMode(), session.getDifficulty(), session.getSolverStrategy(), session.getSeed(),
                session.getElapsedMs(), moves);
        repository.save(saved);
    }

    @Transactional(readOnly = true)
    public Optional<Summary> summary(Long userId) {
        return repository.findById(userId).map(saved -> new Summary(
                saved.getMode(), saved.getDifficulty(), saved.getElapsedMs(), saved.getSolverStrategy().name()));
    }

    @Transactional
    public void delete(Long userId) {
        repository.deleteById(userId);
    }

    /**
     * Rebuilds the saved game by replaying its moves on a freshly seeded session. Empty when nothing is saved or the
     * replay can no longer be continued (it ended, or the moves diverged).
     */
    @Transactional(readOnly = true)
    public Optional<GameSession> restore(Long userId, String sessionId, String playerName) {
        Optional<SavedGame> found = repository.findById(userId);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        SavedGame saved = found.get();
        List<MoveRecord> moves;
        try {
            moves = mapper.readValue(saved.getMovesJson(), MOVES);
        } catch (JsonProcessingException e) {
            return Optional.empty();
        }
        GameSession session = sessionFactory.create(
                sessionId, saved.getMode(), saved.getDifficulty(), saved.getSolverStrategy(), saved.getSeed(),
                playerName);
        session.start();
        for (MoveRecord move : moves) {
            if (!advanceTo(session, move.elapsedMs())) {
                return Optional.empty();
            }
            session.submitValue(move.position(), move.value());
            if (session.isFinished()) {
                return Optional.empty();
            }
        }
        if (!advanceTo(session, saved.getElapsedMs()) || session.isFinished()) {
            return Optional.empty();
        }
        return Optional.of(session);
    }

    private static boolean advanceTo(GameSession session, long elapsedMs) {
        while (session.getElapsedMs() < elapsedMs) {
            if (session.isFinished()) {
                return false;
            }
            session.tick(GameSession.TICK_MS);
        }
        return !session.isFinished();
    }
}
