package com.killer.sudoku.server.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.core.GameSessionFactory;
import com.killer.sudoku.core.MoveResult;
import com.killer.sudoku.model.Difficulty;
import com.killer.sudoku.model.GameMode;
import com.killer.sudoku.model.Position;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:accounts;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
class AccountFlowTest {

    @Autowired AccountService accounts;
    @Autowired ProgressService progress;
    @Autowired SavedGameService savedGames;
    @Autowired GameSessionFactory factory;

    private static String unique() {
        return "p" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    @Test
    void signUpLoginAndLogout() {
        String name = unique();
        AccountService.Session created = accounts.signUp(name, "secret1");
        assertTrue(accounts.authenticate(created.token()).isPresent());
        assertThrows(AccountService.AccountException.class, () -> accounts.signUp(name.toUpperCase(), "secret1"));
        assertThrows(AccountService.AccountException.class, () -> accounts.login(name, "wrong-pass"));
        assertThrows(AccountService.AccountException.class, () -> accounts.signUp("x", "secret1"));
        assertThrows(AccountService.AccountException.class, () -> accounts.signUp(unique(), "123"));

        AccountService.Session again = accounts.login(name, "secret1");
        accounts.logout(again.token());
        assertTrue(accounts.authenticate(again.token()).isEmpty());
        assertTrue(accounts.authenticate(created.token()).isPresent());
        assertTrue(accounts.authenticate(null).isEmpty());
    }

    @Test
    void levelsUnlockAfterEnoughPlaysPerMode() {
        Long id = accounts.signUp(unique(), "secret1").userId();
        assertTrue(progress.isUnlocked(id, GameMode.CLASSIC, Difficulty.EASY));
        assertFalse(progress.isUnlocked(id, GameMode.CLASSIC, Difficulty.MEDIUM));
        for (int i = 0; i < 3; i++) {
            progress.recordPlay(id, GameMode.CLASSIC, Difficulty.EASY);
        }
        assertTrue(progress.isUnlocked(id, GameMode.CLASSIC, Difficulty.MEDIUM));
        assertFalse(progress.isUnlocked(id, GameMode.CLASSIC, Difficulty.HARD));
        assertFalse(progress.isUnlocked(id, GameMode.BOT_CHALLENGE, Difficulty.MEDIUM));
        for (int i = 0; i < 5; i++) {
            progress.recordPlay(id, GameMode.CLASSIC, Difficulty.MEDIUM);
        }
        assertTrue(progress.isUnlocked(id, GameMode.CLASSIC, Difficulty.HARD));
        assertEquals(3, progress.counts(id).get(GameMode.CLASSIC).get(Difficulty.EASY));
    }

    @Test
    void savedGameIsRestoredWithItsMovesAndClock() {
        Long id = accounts.signUp(unique(), "secret1").userId();
        GameSession original = factory.create("orig-session", GameMode.CLASSIC, Difficulty.EASY, "resume-seed", "a");
        original.start();
        Position target = null;
        for (int r = 0; r < 9 && target == null; r++) {
            for (int c = 0; c < 9; c++) {
                if (original.getBoard().getCell(r, c).isEmpty()) {
                    target = new Position(r, c);
                    break;
                }
            }
        }
        for (int i = 0; i < 8; i++) {
            original.tick(GameSession.TICK_MS);
        }
        int solution = original.getBoard().getCell(target).getSolutionValue();
        assertEquals(MoveResult.CORRECT, original.submitValue(target, solution));
        for (int i = 0; i < 4; i++) {
            original.tick(GameSession.TICK_MS);
        }
        savedGames.save(id, original);
        assertTrue(savedGames.summary(id).isPresent());

        Optional<GameSession> restored = savedGames.restore(id, "restored-session", "a");
        assertTrue(restored.isPresent());
        assertEquals(original.getElapsedMs(), restored.get().getElapsedMs());
        assertEquals(solution, restored.get().getBoard().getCell(target).getCurrentValue());
        assertEquals(original.getBoard().getCages().size(), restored.get().getBoard().getCages().size());

        savedGames.delete(id);
        assertTrue(savedGames.restore(id, "gone-session", "a").isEmpty());
    }
}
