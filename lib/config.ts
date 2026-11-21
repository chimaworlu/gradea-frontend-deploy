// Values the SRS says can be tuned, in one place (coding-standards Section 5).

/**
 * How long an emailed password reset link works, in seconds. Must match
 * PASSWORD_RESET_TOKEN_TTL_SECONDS in gradea-backend (src/config/limits.ts), which decides when
 * the link really expires. This copy only feeds the wording on A5 ("It works for 1 hour.").
 */
export const PASSWORD_RESET_LINK_LIFETIME_SECONDS = 60 * 60;

/**
 * How long "Send again" on A5 waits after each send, in seconds (A5 dev notes: 30 seconds with a
 * short countdown). Only slows the button down; the server rate limits requests on its own.
 */
export const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 30;

/**
 * The share of page loads and requests Sentry traces for performance (0.1 is 10%). Errors are
 * always sent when Sentry is on; this only limits tracing.
 */
export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

/**
 * B1: after this many seconds without a result, the "taking longer" line shows (Build Plan
 * Phase 2, "a taking longer state past about 15 seconds").
 */
export const SCAN_TAKING_LONGER_SECONDS = 15;

/**
 * B1: a scan still waiting or working after this many seconds shows the failed screen. The
 * server reports a scan working for 120 seconds as failed (SCORING_STALE_AFTER_SECONDS in
 * gradea-backend); this adds room for three 5-second status checks.
 */
export const SCAN_GIVE_UP_SECONDS = 135;
