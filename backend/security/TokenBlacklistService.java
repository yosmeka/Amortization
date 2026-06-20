package com.lms.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory token blacklist. Invalidated tokens are stored until their
 * natural expiry, then cleaned up automatically.
 * For production, replace with Redis-backed implementation.
 */
@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);

    // token -> expiry instant
    private final ConcurrentHashMap<String, Instant> blacklist = new ConcurrentHashMap<>();

    /**
     * Add a token to the blacklist.
     * @param token the JWT string
     * @param expiresAt when the token naturally expires
     */
    public void blacklist(String token, Instant expiresAt) {
        blacklist.put(token, expiresAt);
        log.debug("Token blacklisted, total blacklisted: {}", blacklist.size());
    }

    /**
     * Check if a token has been blacklisted (i.e. user logged out).
     */
    public boolean isBlacklisted(String token) {
        return blacklist.containsKey(token);
    }

    /**
     * Remove expired tokens from the blacklist every 10 minutes.
     */
    @Scheduled(fixedRate = 600_000)
    public void cleanup() {
        Instant now = Instant.now();
        int before = blacklist.size();
        blacklist.entrySet().removeIf(entry -> entry.getValue().isBefore(now));
        int removed = before - blacklist.size();
        if (removed > 0) {
            log.debug("Cleaned up {} expired blacklisted tokens", removed);
        }
    }
}
