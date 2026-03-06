package com.tripchat.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * StartupSecurityValidator — fail-fast check for critical security configuration.
 *
 * Pattern: Fail Fast.
 * If a required security config is missing or misconfigured, the application
 * refuses to start with a clear, actionable error log — rather than starting
 * silently with a broken or compromised configuration.
 *
 * Why @PostConstruct (not ApplicationRunner)?
 * @PostConstruct runs during bean initialization, before the servlet container
 * accepts any requests. ApplicationRunner runs slightly later (after context refresh).
 * We want to fail as early as possible — @PostConstruct is the right hook.
 *
 * Why a separate class (not in JwtService)?
 * Single Responsibility — JwtService handles token logic; validation of startup
 * configuration is a separate concern. This class can be extended to validate
 * other critical configs (DB password strength, CORS origin, etc.) in one place.
 *
 * Behaviour when validation fails:
 *   1. Logs a FATAL-level ERROR with a clear explanation and fix instructions
 *   2. Throws IllegalStateException → Spring aborts context refresh
 *   3. JVM exits with non-zero code
 *   4. ECS marks the task as unhealthy → ALB stops routing traffic to it
 *   No requests are ever served from a misconfigured instance.
 */
@Slf4j
@Component
public class StartupSecurityValidator {

    // The publicly known default key that was previously hardcoded in application.yml.
    // If this exact value is detected, the app refuses to start — it is compromised.
    private static final String COMPROMISED_DEFAULT =
            "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @PostConstruct
    void validate() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            log.error("╔══════════════════════════════════════════════════════════════╗");
            log.error("║  FATAL — JWT_SECRET environment variable is not set.         ║");
            log.error("║                                                              ║");
            log.error("║  The application cannot start without a JWT signing key.     ║");
            log.error("║  Generate one and set it before starting:                    ║");
            log.error("║                                                              ║");
            log.error("║    openssl rand -base64 32                                   ║");
            log.error("║                                                              ║");
            log.error("║  Local dev : add JWT_SECRET=<value> to your .env file        ║");
            log.error("║  Production: set it in AWS Secrets Manager (tripchat/jwt-secret) ║");
            log.error("╚══════════════════════════════════════════════════════════════╝");
            throw new IllegalStateException(
                    "JWT_SECRET is not configured. Set the JWT_SECRET environment variable before starting.");
        }

        if (COMPROMISED_DEFAULT.equals(jwtSecret)) {
            log.error("╔══════════════════════════════════════════════════════════════╗");
            log.error("║  FATAL — JWT_SECRET is using the known compromised default.  ║");
            log.error("║                                                              ║");
            log.error("║  This key is publicly visible in the source repository.      ║");
            log.error("║  Anyone with repository access can forge valid JWT tokens.   ║");
            log.error("║                                                              ║");
            log.error("║  Generate a new secret and set it before starting:           ║");
            log.error("║    openssl rand -base64 32                                   ║");
            log.error("╚══════════════════════════════════════════════════════════════╝");
            throw new IllegalStateException(
                    "JWT_SECRET is using the publicly known compromised default key. Set a unique JWT_SECRET.");
        }
    }
}
