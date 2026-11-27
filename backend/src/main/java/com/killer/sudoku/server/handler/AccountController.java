package com.killer.sudoku.server.handler;

import com.killer.sudoku.server.account.AccountService;
import com.killer.sudoku.server.account.AccountService.AccountException;
import com.killer.sudoku.server.account.ProgressService;
import com.killer.sudoku.server.account.SavedGameService;
import com.killer.sudoku.server.persistence.UserAccount;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class AccountController {

    public record Credentials(String username, String password) {
    }

    public record AuthResponse(String token, String username) {
    }

    public record MeResponse(
            String username,
            Map<?, ?> progress,
            SavedGameService.Summary activeGame) {
    }

    private final AccountService accounts;
    private final ProgressService progress;
    private final SavedGameService savedGames;

    public AccountController(AccountService accounts, ProgressService progress, SavedGameService savedGames) {
        this.accounts = accounts;
        this.progress = progress;
        this.savedGames = savedGames;
    }

    @PostMapping("/auth/signup")
    public AuthResponse signUp(@RequestBody Credentials credentials) {
        try {
            AccountService.Session session = accounts.signUp(credentials.username(), credentials.password());
            return new AuthResponse(session.token(), session.username());
        } catch (AccountException e) {
            throw toHttp(e);
        }
    }

    @PostMapping("/auth/login")
    public AuthResponse login(@RequestBody Credentials credentials) {
        try {
            AccountService.Session session = accounts.login(credentials.username(), credentials.password());
            return new AuthResponse(session.token(), session.username());
        } catch (AccountException e) {
            throw toHttp(e);
        }
    }

    @PostMapping("/auth/logout")
    public void logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        accounts.logout(bearer(authorization));
    }

    /** Current player, their per-mode play counts and any unfinished game they can continue. */
    @GetMapping("/me")
    public MeResponse me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        UserAccount user = require(authorization);
        return new MeResponse(user.getUsername(), progress.counts(user.getId()),
                savedGames.summary(user.getId()).orElse(null));
    }

    /** Throws away the unfinished game so the player can start a new one. */
    @DeleteMapping("/game/active")
    public void discardActiveGame(@RequestHeader(value = "Authorization", required = false) String authorization) {
        savedGames.delete(require(authorization).getId());
    }

    private UserAccount require(String authorization) {
        return accounts.authenticate(bearer(authorization))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in"));
    }

    static String bearer(String header) {
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        return header.substring(7).trim();
    }

    private static ResponseStatusException toHttp(AccountException e) {
        return new ResponseStatusException(
                e.isUnauthorized() ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_REQUEST, e.getMessage());
    }
}
