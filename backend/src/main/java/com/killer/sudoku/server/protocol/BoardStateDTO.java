package com.killer.sudoku.server.protocol;

import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.model.Board;
import com.killer.sudoku.model.BotEntity;
import com.killer.sudoku.model.Cage;
import com.killer.sudoku.model.Cell;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.PlayerHealth;
import com.killer.sudoku.model.Position;
import java.util.ArrayList;
import java.util.List;

public record BoardStateDTO(
        String sessionId,
        String seed,
        GameMode mode,
        Difficulty difficulty,
        List<List<CellDTO>> cells,
        List<Cage> cages,
        int emptyCellsCount,
        PlayerHealthDTO playerHealth,
        BotDTO bot) {

    public record CellDTO(int row, int col, int currentValue, boolean given, boolean solved) {

        static CellDTO from(Cell cell) {
            return new CellDTO(cell.getRow(), cell.getCol(), cell.getCurrentValue(), cell.isGiven(), cell.isSolved());
        }
    }

    public record PlayerHealthDTO(int maxHp, int currentHp) {

        public static PlayerHealthDTO from(PlayerHealth health) {
            return new PlayerHealthDTO(health.getMaxHp(), health.getCurrentHp());
        }
    }

    public record BotDTO(boolean active, boolean revealed, Position position, long remainingTimeoutMs, long maxTimeoutMs) {

        public static BotDTO from(BotEntity bot) {
            boolean visible = bot.isActive() && bot.isRevealed();
            return new BotDTO(
                    bot.isActive(),
                    bot.isRevealed(),
                    visible ? bot.getPosition() : null,
                    bot.getRemainingTimeoutMs(),
                    bot.getMaxTimeoutMs());
        }
    }

    public static BoardStateDTO from(GameSession session) {
        Board board = session.getBoard();
        List<List<CellDTO>> rows = new ArrayList<>(Board.SIZE);
        for (int row = 0; row < Board.SIZE; row++) {
            List<CellDTO> line = new ArrayList<>(Board.SIZE);
            for (int col = 0; col < Board.SIZE; col++) {
                line.add(CellDTO.from(board.getCell(row, col)));
            }
            rows.add(line);
        }
        boolean botChallenge = session.getGameMode() == GameMode.BOT_CHALLENGE;
        return new BoardStateDTO(
                session.getSessionId(),
                session.getSeed(),
                session.getGameMode(),
                session.getDifficulty(),
                rows,
                board.getCages(),
                board.getEmptyCellsCount(),
                botChallenge ? PlayerHealthDTO.from(session.getPlayerHealth()) : null,
                session.getBot().map(BotDTO::from).orElse(null));
    }
}
