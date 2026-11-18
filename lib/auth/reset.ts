import { apiRequest, type ApiResult } from "../api/client";
import {
  newPasswordProblem,
  PasswordResetResponse,
  type ErrorCode,
  type PasswordResetComplete,
  type PasswordResetRequest,
} from "../api/shared";
import { cleanEmail, placeForCode, type ClientProblem } from "./forms";

// A5 Forgot password: request a link, then set a new password with the token from the link
// (SRS Section 4, POST /api/auth/password-reset). The server stays the judge of every rule.

/** The query name the reset email puts the token in. */
export const RESET_TOKEN_PARAM = "token";

/**
 * The token from the address (?token=...), exactly as it came: never trimmed or changed,
 * because the server compares it byte for byte. Undefined when it is missing or empty.
 */
export function readResetToken(search: string): string | undefined {
  const token = new URLSearchParams(search).get(RESET_TOKEN_PARAM);
  return token === null || token === "" ? undefined : token;
}

/**
 * The same address without the token, so it does not stay in the address bar, the history or
 * a bookmark once read. Other query values and the #hash are kept.
 */
export function addressWithoutToken(pathname: string, search: string, hash: string): string {
  const params = new URLSearchParams(search);
  params.delete(RESET_TOKEN_PARAM);
  const query = params.toString();
  return `${pathname}${query === "" ? "" : `?${query}`}${hash}`;
}

export function requestResetBody(
  email: string,
  botToken: string | undefined,
): PasswordResetRequest {
  return { email: cleanEmail(email), ...(botToken === undefined ? {} : { bot_token: botToken }) };
}

/** The new password is sent exactly as typed, never trimmed. */
export function completeResetBody(token: string, password: string): PasswordResetComplete {
  return { token, password };
}

export function requestReset(
  body: PasswordResetRequest,
  fetchFn?: typeof fetch,
): Promise<ApiResult<PasswordResetResponse>> {
  return apiRequest({
    method: "POST",
    path: "/api/auth/password-reset",
    body,
    response: PasswordResetResponse,
    fetchFn,
  });
}

export function completeReset(
  body: PasswordResetComplete,
  fetchFn?: typeof fetch,
): Promise<ApiResult<PasswordResetResponse>> {
  return apiRequest({
    method: "POST",
    path: "/api/auth/password-reset",
    body,
    response: PasswordResetResponse,
    fetchFn,
  });
}

/** A problem the browser finds with the new password before sending. */
export type NewPasswordProblems = {
  password?: ClientProblem;
  confirm?: "password_mismatch";
};

/** Same rules as sign up for the new password, then the two boxes must match. */
export function checkNewPassword(password: string, confirm: string): NewPasswordProblems {
  const problem = newPasswordProblem(password);
  if (problem !== undefined) return { password: problem };
  if (password !== confirm) return { confirm: "password_mismatch" };
  return {};
}

/** What the reset request leads to. The answer is the same whether the account exists or not. */
export type RequestOutcome =
  { kind: "sent" } | { kind: "error"; code: ErrorCode } | { kind: "network" };

export function requestOutcome(result: ApiResult<PasswordResetResponse>): RequestOutcome {
  if (result.kind === "ok") return { kind: "sent" };
  return result;
}

/** What setting the new password leads to. */
export type CompleteOutcome =
  | { kind: "success" }
  | { kind: "expired" }
  | { kind: "password"; code: ErrorCode }
  | { kind: "form"; code: ErrorCode }
  | { kind: "network" };

/**
 * reset_token_invalid covers every reason the link fails (used, old, unknown), so it always
 * shows "link expired". Password codes go under the new password, like sign up.
 */
export function completeOutcome(result: ApiResult<PasswordResetResponse>): CompleteOutcome {
  if (result.kind === "ok") return { kind: "success" };
  if (result.kind === "network") return result;
  if (result.code === "reset_token_invalid") return { kind: "expired" };
  if (placeForCode(result.code) === "password") return { kind: "password", code: result.code };
  return { kind: "form", code: result.code };
}

/** Seconds left before "Send again" works again, never below zero. */
export function secondsLeft(untilMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((untilMs - nowMs) / 1000));
}
