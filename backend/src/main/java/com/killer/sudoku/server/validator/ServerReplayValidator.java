package com.killer.sudoku.server.validator;

import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.core.GameSessionFactory;
import com.killer.sudoku.core.MoveRecord;
import com.killer.sudoku.core.MoveResult;
import org.springframework.stereotype.Component;

@Component
public class ServerReplayValidator {

    public record Result(boolean valid, long verifiedTimeMs, String reason) {

        static Result invalid(String reason) {
            return new Result(false, 0, reason);
        }
    }

    private static final String REPLAY_SESSION_ID = "replay";

    private final GameSessionFactory sessionFactory;

    public ServerReplayValidator(GameSessionFactory sessionFactory) {
        this.sessionFactory = sessionFactory;
    }

    public Result validate(GameSession original) {
        if (!original.isFinished() || !original.isWon()) {
            return Result.invalid("Session is not a completed win");
        }
        GameSession replay = sessionFactory.create(
                REPLAY_SESSION_ID, original.getGameMode(), original.getDifficulty(), original.getSolverStrategy(), original.getSeed(),
                null);
        replay.start();
        for (MoveRecord move : original.getReplayLog()) {
            if (move.elapsedMs() < replay.getElapsedMs() || move.elapsedMs() % GameSession.TICK_MS != 0) {
                return Result.invalid("Move timestamp is not consistent with the tick clock");
            }
            while (replay.getElapsedMs() < move.elapsedMs()) {
                if (replay.isFinished()) {
                    return Result.invalid("Replay ended before the recorded move");
                }
                replay.tick(GameSession.TICK_MS);
            }
            MoveResult result = replay.submitValue(move.position(), move.value());
            if (result == MoveResult.REJECTED || (result == MoveResult.CORRECT) != move.correct()) {
                return Result.invalid("Move " + move.position() + " diverged from the replay");
            }
        }
        if (!replay.isFinished() || !replay.isWon()) {
            return Result.invalid("Replay did not finish with a win");
        }
        if (replay.getFinalTimeMs() != original.getFinalTimeMs()) {
            return Result.invalid("Recorded time does not match the replayed time");
        }
        return new Result(true, replay.getFinalTimeMs(), null);
    }
}
