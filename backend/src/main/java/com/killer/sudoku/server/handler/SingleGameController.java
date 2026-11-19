package com.killer.sudoku.server.handler;

import com.killer.sudoku.core.GameSession;
import com.killer.sudoku.core.GameSessionFactory;
import com.killer.sudoku.model.Position;
import com.killer.sudoku.model.SolverStrategyType;
import com.killer.sudoku.server.leaderboard.DailyLeaderboard;
import com.killer.sudoku.server.listener.WebSocketEventListener;
import com.killer.sudoku.server.protocol.GameEventMessage;
import com.killer.sudoku.server.protocol.GameEventType;
import com.killer.sudoku.server.protocol.Payloads;
import com.killer.sudoku.server.protocol.StartGameRequest;
import com.killer.sudoku.server.protocol.SubmitCellRequest;
import com.killer.sudoku.server.validator.ServerReplayValidator;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RestController;

@Controller
@RestController
public class SingleGameController {

    private static final Logger log = LoggerFactory.getLogger(SingleGameController.class);

    private static final Pattern SESSION_ID = Pattern.compile("[A-Za-z0-9_-]{8,64}");
    private static final int MAX_SEED_LENGTH = 64;
    private static final int MAX_PLAYER_NAME_LENGTH = 20;
    private static final String DEFAULT_PLAYER_NAME = "Anonymous";
    private static final int MAX_ACTIVE_SESSIONS = 500;
    private static final long MAX_GAME_DURATION_MS = 2 * 60 * 60 * 1000L;
    private static final String REASON_SESSION_EXPIRED = "SESSION_EXPIRED";

    private final ConcurrentHashMap<String, GameSession> sessions = new ConcurrentHashMap<>();
    private final GameSessionFactory sessionFactory;
    private final SimpMessagingTemplate messagingTemplate;
    private final DailyLeaderboard leaderboard;
    private final ServerReplayValidator replayValidator;

    public SingleGameController(
            GameSessionFactory sessionFactory,
            SimpMessagingTemplate messagingTemplate,
            DailyLeaderboard leaderboard,
            ServerReplayValidator replayValidator) {
        this.sessionFactory = sessionFactory;
        this.messagingTemplate = messagingTemplate;
        this.leaderboard = leaderboard;
        this.replayValidator = replayValidator;
    }

    @MessageMapping("/game/{sessionId}/start")
    public void start(@DestinationVariable("sessionId") String sessionId, @Payload StartGameRequest request) {
        if (!SESSION_ID.matcher(sessionId).matches()) {
            log.warn("Rejected start with malformed session id");
            return;
        }
        if (request == null || request.mode() == null || request.difficulty() == null) {
            sendError(sessionId, "mode and difficulty are required");
            return;
        }
        String seed = resolveSeed(request.seed());
        if (seed.length() > MAX_SEED_LENGTH) {
            sendError(sessionId, "seed is too long");
            return;
        }
        if (sessions.containsKey(sessionId)) {
            sendError(sessionId, "Session already exists");
            return;
        }
        if (sessions.size() >= MAX_ACTIVE_SESSIONS) {
            sendError(sessionId, "Server is busy, try again later");
            return;
        }
        SolverStrategyType strategy =
                resolveStrategy(request.solverStrategy(), leaderboard.dailyDateOf(seed).isPresent());
        GameSession session = sessionFactory.create(
                sessionId, request.mode(), request.difficulty(), strategy, seed,
                sanitizePlayerName(request.playerName()));
        if (sessions.putIfAbsent(sessionId, session) != null) {
            sendError(sessionId, "Session already exists");
            return;
        }
        try {
            session.addListener(new WebSocketEventListener(sessionId, messagingTemplate));
            session.start();
        } catch (RuntimeException e) {
            sessions.remove(sessionId, session);
            throw e;
        }
    }

    @MessageMapping("/game/{sessionId}/submit")
    public void submit(@DestinationVariable("sessionId") String sessionId, @Payload SubmitCellRequest request) {
        GameSession session = sessions.get(sessionId);
        if (session == null) {
            if (SESSION_ID.matcher(sessionId).matches()) {
                sendError(sessionId, "Unknown or finished session");
            }
            return;
        }
        if (request == null) {
            return;
        }
        try {
            session.submitValue(new Position(request.row(), request.col()), request.value());
        } catch (IllegalArgumentException e) {
            sendError(sessionId, "Invalid cell position");
        }
    }

    @MessageMapping("/game/{sessionId}/forfeit")
    public void forfeit(@DestinationVariable("sessionId") String sessionId) {
        GameSession session = sessions.get(sessionId);
        if (session != null) {
            session.forfeit(GameSession.REASON_FORFEIT);
        }
    }

    @MessageExceptionHandler
    public void handleMessageException(Exception exception) {
        log.warn("Failed to handle game message", exception);
    }

    @Scheduled(fixedRate = GameSession.TICK_MS)
    public void tickActiveSessions() {
        for (Map.Entry<String, GameSession> entry : sessions.entrySet()) {
            GameSession session = entry.getValue();
            try {
                session.tick(GameSession.TICK_MS);
                if (session.getElapsedMs() > MAX_GAME_DURATION_MS) {
                    session.forfeit(REASON_SESSION_EXPIRED);
                }
                if (session.isFinished()) {
                    sessions.remove(entry.getKey(), session);
                    recordResult(session);
                }
            } catch (RuntimeException e) {
                log.error("Session {} failed and was dropped", entry.getKey(), e);
                sessions.remove(entry.getKey(), session);
            }
        }
    }

    private void recordResult(GameSession session) {
        if (!session.isWon()) {
            return;
        }
        Optional<LocalDate> date = leaderboard.dailyDateOf(session.getSeed());
        if (date.isEmpty() || !leaderboard.accepts(date.get())) {
            return;
        }
        ServerReplayValidator.Result result = replayValidator.validate(session);
        if (!result.valid()) {
            log.warn("Replay rejected for session {}: {}", session.getSessionId(), result.reason());
            return;
        }
        leaderboard.submit(
                session.getPlayerName(), session.getGameMode(), session.getDifficulty(), date.get(), result.verifiedTimeMs());
    }

    private void sendError(String sessionId, String message) {
        messagingTemplate.convertAndSend(
                WebSocketEventListener.destination(sessionId),
                GameEventMessage.of(GameEventType.ERROR, sessionId, new Payloads.ErrorMessage(message)));
    }

    static SolverStrategyType resolveStrategy(SolverStrategyType requested, boolean dailySeed) {
        if (dailySeed || requested == null) {
            return SolverStrategyType.OPTIMIZED_MRV_PRUNING;
        }
        return requested;
    }

    private static String resolveSeed(String requested) {
        if (requested == null || requested.isBlank()) {
            return UUID.randomUUID().toString();
        }
        return requested.trim();
    }

    private static String sanitizePlayerName(String name) {
        if (name == null) {
            return DEFAULT_PLAYER_NAME;
        }
        String cleaned = name.replaceAll("\\p{Cntrl}", "").trim();
        if (cleaned.isEmpty()) {
            return DEFAULT_PLAYER_NAME;
        }
        return cleaned.length() > MAX_PLAYER_NAME_LENGTH ? cleaned.substring(0, MAX_PLAYER_NAME_LENGTH) : cleaned;
    }
}
