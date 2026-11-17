// Values the SRS says can be tuned, in one place (coding-standards Section 5).

/**
 * How long an emailed password reset link works, in seconds. Must match
 * PASSWORD_RESET_TOKEN_TTL_SECONDS in gradea-backend (src/config/limits.ts), which decides when
 * the link really expires. This copy only feeds the wording on A5 ("It works for 1 hour.").
 */
export const PASSWORD_RESET_LINK_LIFETIME_SECONDS = 60 * 60;
