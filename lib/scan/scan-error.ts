import { errorMessage, getContent } from "../content";
import type { FailedReason } from "./status";
import type { ScanErrorCode } from "./upload";

// The B2 wording for each reason. The two B2 frames give their own heading and body (AI failed,
// Unreadable file); the reasons with no frame of their own take the shared error wording from
// content/shared/errors.json as the body, under the nearest frame's heading.

export type ScanErrorReason = FailedReason | ScanErrorCode;

export type ScanErrorWording = { heading: string; body: string };

export function scanErrorWording(reason: ScanErrorReason): ScanErrorWording {
  const text = getContent("app/scan-error");
  switch (reason) {
    case "scoring_failed":
    case "stale":
      return text.scoringFailed;
    case "file_unreadable":
      return text.unreadableFile;
    case "file_not_english":
      return { heading: text.notEnglish.heading, body: errorMessage("file_not_english") };
    case "extraction_failed":
      return { heading: text.scoringFailed.heading, body: errorMessage("extraction_failed") };
    case "scan_limit_reached":
      return { heading: text.limitReached.heading, body: errorMessage("scan_limit_reached") };
  }
}

/**
 * "Try again" shows where trying again can help: a scoring failure or a stale scan (the retry
 * API), and an extraction failure (the same file sent again). A file we cannot read, a CV not
 * in English, or the monthly limit only offer "Upload another CV" (B2 Unreadable file frame).
 */
export function canTryAgain(reason: ScanErrorReason): boolean {
  return reason === "scoring_failed" || reason === "stale" || reason === "extraction_failed";
}
