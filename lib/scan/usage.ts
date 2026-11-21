import { apiRequest, type ApiResult } from "../api/client";
import { UsageResponse } from "../api/shared";
import { fillPlaceholders, getContent } from "../content";
import { resetDateLabel } from "./upload";

// The A1 Free usage line (SRS Section 7). GET /api/usage counts exactly as the scan limit does,
// so the line and the limit never disagree. Asked once when the upload page loads.

export function fetchUsage(fetchFn?: typeof fetch): Promise<ApiResult<UsageResponse>> {
  return apiRequest({ method: "GET", path: "/api/usage", response: UsageResponse, fetchFn });
}

/**
 * "4 of 5 General scans left this month. Resets on 1 Dec.", with the date in Lagos time. None for
 * an active PRO plan, which has no monthly limit (limit is null).
 */
export function usageLine(usage: UsageResponse): string | undefined {
  const { limit, remaining } = usage.general;
  if (limit === null || remaining === null) return undefined;
  return fillPlaceholders(getContent("app/upload").usage.line, {
    remaining,
    limit,
    date: resetDateLabel(usage.reset_at),
  });
}
