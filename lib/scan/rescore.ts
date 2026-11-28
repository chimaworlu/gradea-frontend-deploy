import { fillPlaceholders, getContent } from "../content";
import { checkJobDescription, type ScanType } from "./upload";

// The results top bar (Build Plan Phase 3, PRD FR-28): the General / Job-specific switch and the
// B6 Re-score popup. Scanning the same mode again needs a new file (B6 dev notes); moving to the
// other mode can scan the CV from these results again, sent by its scan_session_id.

/** Why "Scan my CV" is off, if it is: no CV for a re-score, or no job description. */
export type RescoreCheck =
  | { kind: "ready" }
  | { kind: "blocked"; reason: "file" | "jobDescription" };

/**
 * The button's state for the popup's mode. As on A1, an empty job description turns the button
 * off; a too short or too long one is shown when the button is pressed, with A1's wording.
 */
export function rescoreCheck(input: {
  pageType: ScanType;
  mode: ScanType;
  hasFile: boolean;
  jobText: string;
}): RescoreCheck {
  if (input.mode === input.pageType && !input.hasFile) return { kind: "blocked", reason: "file" };
  if (input.mode === "smart_target") {
    const checked = checkJobDescription(input.jobText);
    if (checked.kind === "problem" && checked.code === "job_description_required") {
      return { kind: "blocked", reason: "jobDescription" };
    }
  }
  return { kind: "ready" };
}

/** The mode's own name, "General" or "Job-specific", as on the A1 switch. */
export function scanTypeName(scanType: ScanType): string {
  const text = getContent("app/upload").modeSwitch;
  return scanType === "general" ? text.general : text.jobSpecific;
}

/**
 * "Current score: 74", or "Current score: 74 (General)" once the popup is on the other mode, so
 * the chip names the score being compared (B6 dev notes, frame 2).
 */
export function currentScoreLabel(score: string, pageType: ScanType, mode: ScanType): string {
  const text = getContent("app/rescore").popup.currentScore;
  return mode === pageType
    ? fillPlaceholders(text.same, { score })
    : fillPlaceholders(text.other, { score, mode: scanTypeName(pageType) });
}
