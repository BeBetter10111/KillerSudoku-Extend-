package com.killer.sudoku.support;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.PuzzleGenerator;
import com.killer.sudoku.algorithm.WeightedRandomBotStrategy;
import com.killer.sudoku.config.DifficultyConfig;
import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.core.GameSessionFactory;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Position;
import java.util.List;
import java.util.Optional;
import java.util.Random;

public final class TestSessions {

    private TestSessions() {
    }

    public static GameSessionFactory factory() {
        BacktrackingCageGenerator cageGenerator = new BacktrackingCageGenerator();
        return new GameSessionFactory(
                new PuzzleGenerator(cageGenerator),
                new DifficultyConfig(new WeightedRandomBotStrategy(), cageGenerator));
    }

    public static Optional<Position> revealedBot(GameSession session) {
        return session.getBot().filter(BotEntity::isActive).filter(BotEntity::isRevealed).map(BotEntity::getPosition);
    }

    public static void solve(GameSession session, Position position) {
        Cell cell = session.getBoard().getCell(position);
        session.submitValue(position, cell.getSolutionValue());
    }

    public static void playToCompletion(
            GameSession session, int idleTicks, int ticksPerMove, long playerSeed, int wrongEvery) {
        Random rng = new Random(playerSeed);
        for (int i = 0; i < idleTicks; i++) {
            session.tick(GameSession.TICK_MS);
        }
        int move = 0;
        while (!session.isFinished()) {
            for (int i = 0; i < ticksPerMove && !session.isFinished(); i++) {
                session.tick(GameSession.TICK_MS);
            }
            if (session.isFinished()) {
                break;
            }
            List<Position> empty = session.getBoard().getEmptyCells();
            Position target = revealedBot(session).orElseGet(() -> empty.get(rng.nextInt(empty.size())));
            Cell cell = session.getBoard().getCell(target);
            if (wrongEvery > 0 && move % wrongEvery == 0) {
                session.submitValue(target, cell.getSolutionValue() % 9 + 1);
            }
            session.submitValue(target, cell.getSolutionValue());
            if (++move > 10_000) {
                throw new AssertionError("Scripted player is stuck");
            }
        }
    }
}
