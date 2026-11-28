import { apiRequest, type ApiResult } from "./api/client";
import {
  FeedbackMessage,
  FeedbackResponse,
  type FeedbackPage,
  type FeedbackRequest,
  type ScanType,
} from "./api/shared";
import { errorMessage, getContent } from "./content";

// D4 Feedback form (Build Plan Phase 3, PRD FR-28 More menu). The message goes to the server in
// this one request only: never into browser storage, the address, a log or an analytics event.

/** The page name the API takes for the results page of each kind of scan. */
export function resultsFeedbackPage(scanType: ScanType): FeedbackPage {
  return scanType === "general" ? "results_general" : "results_job_specific";
}

/** True when the box holds something the server would take (not empty once trimmed). */
export function hasFeedbackText(message: string): boolean {
  return FeedbackMessage.safeParse(message).success;
}

/**
 * POST /api/feedback with the message and the page. A signed-in user sends no bot token
 * (SRS Section 4).
 */
export function sendFeedback(
  message: string,
  page: FeedbackPage,
  fetchFn?: typeof fetch,
): Promise<ApiResult<FeedbackResponse>> {
  const body: FeedbackRequest = { message, page };
  return apiRequest({
    method: "POST",
    path: "/api/feedback",
    body,
    response: FeedbackResponse,
    fetchFn,
  });
}

/** What the popup shows after a send: the Thanks state, or the wording for what went wrong. */
export function feedbackOutcome(
  result: ApiResult<FeedbackResponse>,
): { kind: "sent" } | { kind: "failed"; message: string } {
  if (result.kind === "ok") return { kind: "sent" };
  if (result.kind === "network") {
    return { kind: "failed", message: getContent("shared/errors").network };
  }
  return { kind: "failed", message: errorMessage(result.code) };
}
