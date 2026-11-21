import { apiRequest, type ApiResult } from "../api/client";
import { ScanStatusResponse, type ScanFailure, type ScanStatus } from "../api/shared";
import { SCAN_GIVE_UP_SECONDS, SCAN_TAKING_LONGER_SECONDS } from "../config";

// B1 Processing and B2 Scan error (Build Plan Phase 2). The page asks GET /api/scan/:id/status
// and waits the retry_after the answer gives (2, then 3, then 5 seconds), never less, and stops
// once the scan is done or failed (SRS Section 4). Nothing here guesses progress: the steps
// come only from the status the server reports.

/** Where the results screen lives for one scan (B3, built in Part 3). */
export function resultsPath(scanSessionId: string): string {
  return `/scan/${encodeURIComponent(scanSessionId)}/results`;
}

export function getScanStatus(
  scanSessionId: string,
  fetchFn?: typeof fetch,
): Promise<ApiResult<ScanStatusResponse>> {
  return apiRequest({
    method: "GET",
    path: `/api/scan/${encodeURIComponent(scanSessionId)}/status`,
    response: ScanStatusResponse,
    fetchFn,
  });
}

/**
 * POST /api/scan/:id/retry: scores a failed scan again. A scan already working or done is
 * answered as it is, so a double tap never costs a second AI call (SRS Section 4).
 */
export function retryScan(
  scanSessionId: string,
  fetchFn?: typeof fetch,
): Promise<ApiResult<ScanStatusResponse>> {
  return apiRequest({
    method: "POST",
    path: `/api/scan/${encodeURIComponent(scanSessionId)}/retry`,
    response: ScanStatusResponse,
    fetchFn,
  });
}

/** The smallest wait the server sends (SCAN_STATUS_RETRY_AFTER_SECONDS starts at 2). */
const MIN_RETRY_AFTER_SECONDS = 2;

/** How long to wait before the next check: the server's retry_after, and never faster. */
export function pollDelayMs(retryAfter: number | null): number {
  return Math.max(retryAfter ?? MIN_RETRY_AFTER_SECONDS, MIN_RETRY_AFTER_SECONDS) * 1000;
}

export type StepState = "done" | "current" | "pending";
export type ProcessingSteps = { reading: StepState; checking: StepState; preparing: StepState };

/**
 * The three B1 steps from the scan's real status: waiting is still on reading, working is
 * checking the four categories, done is preparing the results (the page then moves on).
 */
export function processingSteps(status: ScanStatus): ProcessingSteps {
  switch (status) {
    case "waiting":
      return { reading: "current", checking: "pending", preparing: "pending" };
    case "working":
      return { reading: "done", checking: "current", preparing: "pending" };
    case "done":
    case "failed":
      return { reading: "done", checking: "done", preparing: "current" };
  }
}

/** Why the B2 screen shows. "stale" is a scan left waiting or working too long. */
export type FailedReason = ScanFailure | "stale";

/** What the page shows after a status answer. */
export type StatusView =
  | { kind: "polling"; status: ScanStatus; delayMs: number }
  | { kind: "done"; path: string }
  | { kind: "failed"; reason: FailedReason }
  | { kind: "expired" }
  | { kind: "signedOut" }
  | { kind: "retryLater"; delayMs: number };

export function statusView(
  result: ApiResult<ScanStatusResponse>,
  scanSessionId: string,
  elapsedSeconds: number,
): StatusView {
  if (result.kind === "network") {
    // A dropped connection is not a failed scan: ask again after the longest server wait.
    return { kind: "retryLater", delayMs: pollDelayMs(5) };
  }
  if (result.kind === "error") {
    if (result.code === "not_signed_in") return { kind: "signedOut" };
    // Unknown, deleted or someone else's scan: the D1 "start again" screen.
    if (result.code === "not_found" || result.code === "guest_session_invalid") {
      return { kind: "expired" };
    }
    return { kind: "retryLater", delayMs: pollDelayMs(5) };
  }
  const { status, retry_after: retryAfter, failure } = result.data;
  if (status === "done") return { kind: "done", path: resultsPath(scanSessionId) };
  if (status === "failed") return { kind: "failed", reason: failure ?? "scoring_failed" };
  if (elapsedSeconds >= SCAN_GIVE_UP_SECONDS) return { kind: "failed", reason: "stale" };
  return { kind: "polling", status, delayMs: pollDelayMs(retryAfter) };
}

/** The "taking longer" line on B1. */
export function isTakingLonger(elapsedSeconds: number): boolean {
  return elapsedSeconds >= SCAN_TAKING_LONGER_SECONDS;
}
