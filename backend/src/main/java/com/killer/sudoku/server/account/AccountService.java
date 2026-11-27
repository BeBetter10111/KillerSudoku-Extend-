package com.killer.sudoku.server.account;

import com.killer.sudoku.server.persistence.AuthToken;
import com.killer.sudoku.server.persistence.Repositories.TokenRepository;
import com.killer.sudoku.server.persistence.Repositories.UserRepository;
import com.killer.sudoku.server.persistence.UserAccount;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AccountService {

    public static final Duration TOKEN_TTL = Duration.ofDays(30);
    private static final Pattern USERNAME = Pattern.compile("[A-Za-z0-9_]{3,20}");
    private static final int MIN_PASSWORD = 6;
    private static final int MAX_PASSWORD = 72;

    /** Raised for invalid input or credentials; the message is safe to show to the player. */
    public static class AccountException extends RuntimeException {
        private final boolean unauthorized;

        public AccountException(String message, boolean unauthorized) {
            super(message);
            this.unauthorized = unauthorized;
        }

        public boolean isUnauthorized() {
            return unauthorized;
        }
    }

    public record Session(String token, Long userId, String username) {
    }

    private final UserRepository users;
    private final TokenRepository tokens;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    public AccountService(UserRepository users, TokenRepository tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    public Session signUp(String username, String password) {
        String name = username == null ? "" : username.trim();
        if (!USERNAME.matcher(name).matches()) {
            throw new AccountException("Username must be 3-20 letters, numbers or underscores", false);
        }
        validatePassword(password);
        if (users.findByUsernameKey(name.toLowerCase(Locale.ROOT)).isPresent()) {
            throw new AccountException("That username is already taken", false);
        }
        try {
            UserAccount user = users.saveAndFlush(new UserAccount(name, encoder.encode(password)));
            return issueToken(user);
        } catch (DataIntegrityViolationException e) {
            throw new AccountException("That username is already taken", false);
        }
    }

    public Session login(String username, String password) {
        String key = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        Optional<UserAccount> user = users.findByUsernameKey(key);
        if (user.isEmpty() || password == null || !encoder.matches(password, user.get().getPasswordHash())) {
            throw new AccountException("Wrong username or password", true);
        }
        return issueToken(user.get());
    }

    public void logout(String token) {
        if (token != null) {
            tokens.deleteById(hash(token));
        }
    }

    /** Resolves a bearer token to its player, or empty when missing, unknown or expired. */
    public Optional<UserAccount> authenticate(String token) {
        if (token == null || token.isBlank() || token.length() > 128) {
            return Optional.empty();
        }
        Optional<AuthToken> stored = tokens.findById(hash(token));
        if (stored.isEmpty()) {
            return Optional.empty();
        }
        if (stored.get().getExpiresAt().isBefore(Instant.now())) {
            tokens.delete(stored.get());
            return Optional.empty();
        }
        return users.findById(stored.get().getUserId());
    }

    private static void validatePassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD || password.length() > MAX_PASSWORD) {
            throw new AccountException("Password must be " + MIN_PASSWORD + "-" + MAX_PASSWORD + " characters", false);
        }
    }

    private Session issueToken(UserAccount user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.save(new AuthToken(hash(token), user.getId(), Instant.now().plus(TOKEN_TTL)));
        return new Session(token, user.getId(), user.getUsername());
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
