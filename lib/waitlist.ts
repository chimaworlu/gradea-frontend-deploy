import { z } from "zod";

/**
 * Joining the launch waitlist from G12 (PRD FR-56, SRS Section 4 `POST /api/waitlist`).
 *
 * Privacy: the email only ever travels in the POST body. It is never logged, stored in the
 * browser or put in a URL (AGENTS.md Sections 2 and 4).
 */

export const WAITLIST_PATH = "/api/waitlist";
export const WAITLIST_SOURCE = "launch";
/** Give up on a hanging request after this long and show the general error. */
export const WAITLIST_TIMEOUT_MS = 15_000;
/** RFC 5321 limit on the length of an email address. */
const MAX_EMAIL_LENGTH = 254;

export type WaitlistOutcome = "joined" | "invalid_email" | "rate_limited" | "error";

/** Trims the email before it is checked or sent. */
export function normaliseEmail(raw: string): string {
  return raw.trim();
}

/**
 * The on-page format check, run before any request. It catches typos such as a missing
 * domain ending; the server still has the final say (it answers validation_failed).
 */
export function isValidEmail(email: string): boolean {
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email);
}

// SRS Section 4: success is 200 with { "ok": true }, the same for a new and a repeat email.
const successSchema = z.object({ ok: z.literal(true) });
// SRS Section 12: every error has the one shape { code, message }. The page shows its own
// wording chosen by code, never the server's message.
const errorSchema = z.object({ code: z.string(), message: z.string() });

/** Maps an API response to what the page shows. Anything unexpected is the general error. */
export function toWaitlistOutcome(status: number, body: unknown): WaitlistOutcome {
  if (status === 200) {
    return successSchema.safeParse(body).success ? "joined" : "error";
  }
  const parsed = errorSchema.safeParse(body);
  if (!parsed.success) {
    return "error";
  }
  if (status === 400 && parsed.data.code === "validation_failed") {
    return "invalid_email";
  }
  if (status === 429 && parsed.data.code === "rate_limited") {
    return "rate_limited";
  }
  return "error";
}

export type WaitlistRequestBody = {
  email: string;
  source: typeof WAITLIST_SOURCE;
  bot_token?: string;
};

/** The request body. bot_token is included only when there is a token (Turnstile key set). */
export function buildWaitlistBody(
  email: string,
  botToken: string | undefined,
): WaitlistRequestBody {
  return botToken === undefined
    ? { email, source: WAITLIST_SOURCE }
    : { email, source: WAITLIST_SOURCE, bot_token: botToken };
}

export type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

/** Sends one join request and maps the answer. Network failures and timeouts are "error". */
export async function postWaitlist(
  apiUrl: string,
  body: WaitlistRequestBody,
  fetchFn: FetchFn,
): Promise<WaitlistOutcome> {
  let response: Response;
  try {
    response = await fetchFn(`${apiUrl}${WAITLIST_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      // The waitlist needs no login cookie, so none is sent.
      credentials: "omit",
      signal: AbortSignal.timeout(WAITLIST_TIMEOUT_MS),
    });
  } catch {
    // Offline, DNS, CORS or timeout: the visitor sees the general error and can try again.
    return "error";
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    // A body that is not JSON is not a shape we know, so it maps to the general error.
    return "error";
  }
  return toWaitlistOutcome(response.status, responseBody);
}

export type SubmitWaitlistInput = {
  rawEmail: string;
  /** Read only after the email passes the check; throws if the API address is not set. */
  getApiUrl: () => string;
  /** "" when the bot check is off; then no token is requested or sent. */
  turnstileSiteKey: string;
  getBotToken: () => Promise<string>;
  fetchFn: FetchFn;
};

/**
 * The whole submit: trim, check the format on the page (no request for a bad email), read the
 * API address, get a bot-check token only when a Turnstile key is set, then send.
 */
export async function submitWaitlist(input: SubmitWaitlistInput): Promise<WaitlistOutcome> {
  const email = normaliseEmail(input.rawEmail);
  if (!isValidEmail(email)) {
    return "invalid_email";
  }

  let apiUrl: string;
  try {
    apiUrl = input.getApiUrl();
  } catch {
    // A missing API address is a deploy mistake; the visitor sees the general error.
    return "error";
  }

  let botToken: string | undefined;
  if (input.turnstileSiteKey !== "") {
    try {
      botToken = await input.getBotToken();
    } catch {
      // The bot check could not run (blocked script, timeout): general error, try again.
      return "error";
    }
  }

  return postWaitlist(apiUrl, buildWaitlistBody(email, botToken), input.fetchFn);
}

/**
 * Runs one task at a time: a call made while one is still running is ignored and returns
 * undefined. The form uses it so a second tap while sending sends nothing.
 */
export function createSingleFlight<T>() {
  let running = false;
  return async (task: () => Promise<T>): Promise<T | undefined> => {
    if (running) {
      return undefined;
    }
    running = true;
    try {
      return await task();
    } finally {
      running = false;
    }
  };
}
