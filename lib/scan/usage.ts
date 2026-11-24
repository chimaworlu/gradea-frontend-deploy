import { apiRequest, type ApiResult } from "../api/client";
import { UsageResponse } from "../api/shared";
import { fillPlaceholders, getContent } from "../content";
import { resetDateLabel, type ScanType } from "./upload";

// The A1 Free usage line (SRS Section 7). GET /api/usage counts exactly as the scan limit does,
// so the line and the limit never disagree. Asked once when the upload page loads.

export function fetchUsage(fetchFn?: typeof fetch): Promise<ApiResult<UsageResponse>> {
  return apiRequest({ method: "GET", path: "/api/usage", response: UsageResponse, fetchFn });
}

/**
 * "4 of 5 General scans left this month. Resets on 1 Dec.", with the date in Lagos time, and the
 * same for Job-specific: each kind of scan has its own allowance (SRS Section 7). None for an
 * active PRO plan, which has no monthly limit (limit is null).
 */
export function usageLine(
  usage: UsageResponse,
  scanType: ScanType = "general",
): string | undefined {
  const text = getContent("app/upload").usage;
  const { limit, remaining } = scanType === "general" ? usage.general : usage.job_specific;
  if (limit === null || remaining === null) return undefined;
  const jobSpecificLine = limit === 1 ? text.jobSpecific.one : text.jobSpecific.other;
  const line = scanType === "general" ? text.line : jobSpecificLine;
  return fillPlaceholders(line, { remaining, limit, date: resetDateLabel(usage.reset_at) });
}

/**
 * Which allowance ran out, for the limit popup after a claim. The claim's answer does not say the
 * kind of scan and none is kept in the browser, so it is read from the usage itself. Both used up,
 * or neither, gives General, whose wording ("your scans") is true of either.
 */
export function limitedScanType(usage: UsageResponse): ScanType {
  return usage.job_specific.remaining === 0 && usage.general.remaining !== 0
    ? "smart_target"
    : "general";
}
