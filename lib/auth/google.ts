import { apiRequest, type ApiResult } from "../api/client";
import {
  AuthUserResponse,
  GoogleOkResponse,
  GooglePendingResponse,
  type CareerLevel,
  type ErrorCode,
  type GoogleCompleteRequest,
  type GoogleLinkRequest,
} from "../api/shared";
import { placeForCode } from "./forms";

// The two pages the API sends the browser to after Google (SRS Section 5): /link-google (A6)
// when the Google email already has a password account, and /signup/google for a new account.
// The pending Google sign-in lives in a short-lived httpOnly cookie on the API, so every call
// sends credentials and the browser never sees or keeps it.

export type PendingFlow = GooglePendingResponse["flow"];

export function getPending(fetchFn?: typeof fetch): Promise<ApiResult<GooglePendingResponse>> {
  return apiRequest({
    method: "GET",
    path: "/api/auth/google/pending",
    response: GooglePendingResponse,
    fetchFn,
  });
}

export function linkGoogle(
  body: GoogleLinkRequest,
  fetchFn?: typeof fetch,
): Promise<ApiResult<GoogleOkResponse>> {
  return apiRequest({
    method: "POST",
    path: "/api/auth/google/link",
    body,
    response: GoogleOkResponse,
    fetchFn,
  });
}

export function completeGoogleSignup(
  body: GoogleCompleteRequest,
  fetchFn?: typeof fetch,
): Promise<ApiResult<AuthUserResponse>> {
  return apiRequest({
    method: "POST",
    path: "/api/auth/google/complete",
    body,
    response: AuthUserResponse,
    fetchFn,
  });
}

export function cancelGoogle(fetchFn?: typeof fetch): Promise<ApiResult<GoogleOkResponse>> {
  return apiRequest({
    method: "POST",
    path: "/api/auth/google/cancel",
    response: GoogleOkResponse,
    fetchFn,
  });
}

/** The password is sent exactly as typed, never trimmed. */
export function linkBody(password: string): GoogleLinkRequest {
  return { password };
}

/** The finish-sign-up body. The consent line on the page counts as consent. */
export function completeBody(careerLevel: CareerLevel): GoogleCompleteRequest {
  return { career_level: careerLevel, consent: true };
}

/** What the page shows after asking the API about the pending Google sign-in. */
export type PendingView =
  | { kind: "ready"; email: string }
  | { kind: "expired" }
  | { kind: "error"; code: ErrorCode }
  | { kind: "network" };

/**
 * A missing or old pending cookie (google_pending_invalid), or one for the other page's flow,
 * shows the timed-out state: the person starts with Google again.
 */
export function pendingView(
  result: ApiResult<GooglePendingResponse>,
  expected: PendingFlow,
): PendingView {
  if (result.kind === "ok") {
    return result.data.flow === expected
      ? { kind: "ready", email: result.data.email }
      : { kind: "expired" };
  }
  if (result.kind === "network") return result;
  if (result.code === "google_pending_invalid") return { kind: "expired" };
  return { kind: "error", code: result.code };
}

/** Where an answer to link or complete puts the person. */
export type SubmitOutcome =
  | { kind: "done" }
  | { kind: "expired" }
  | { kind: "careerLevel"; code: ErrorCode }
  | { kind: "form"; code: ErrorCode }
  | { kind: "network" };

/**
 * wrong_password is the A6 "That password is wrong." line above the button, like every other
 * code but career_level_required, which sits under the picker on /signup/google.
 */
export function submitOutcome<T>(result: ApiResult<T>): SubmitOutcome {
  if (result.kind === "ok") return { kind: "done" };
  if (result.kind === "network") return result;
  if (result.code === "google_pending_invalid") return { kind: "expired" };
  if (placeForCode(result.code) === "careerLevel")
    return { kind: "careerLevel", code: result.code };
  return { kind: "form", code: result.code };
}
