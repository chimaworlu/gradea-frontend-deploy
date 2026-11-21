import { apiRequest, type ApiResult } from "../api/client";
import {
  ScanResultResponse,
  type FlaggedLine,
  type ResultCategory,
  type ScoreCategory,
} from "../api/shared";
import { cvSectionName, fillPlaceholders, getContent } from "../content";
import { processingPath } from "./upload";
import { pollDelayMs } from "./status";

// B3 Results (Build Plan Phase 2, PRD Section 12.1). The page asks GET /api/scan/:id/result once,
// then again only while line detail is still running, waiting the answer's retry_after. Scores
// show only once line detail is done: the overview's first scores are replaced when it ends
// (PRD 12.1), so showing them earlier would make the numbers change in front of the person.
// Tier gating is done by the server: a locked category arrives with no lines at all.

export function getScanResult(
  scanSessionId: string,
  fetchFn?: typeof fetch,
): Promise<ApiResult<ScanResultResponse>> {
  return apiRequest({
    method: "GET",
    path: `/api/scan/${encodeURIComponent(scanSessionId)}/result`,
    response: ScanResultResponse,
    fetchFn,
  });
}

/**
 * POST /api/scan/:id/retry-detail: runs the failed categories of line detail again. Only the
 * request that moves it from failed starts a call, so a double tap never starts two.
 */
export function retryLineDetail(
  scanSessionId: string,
  fetchFn?: typeof fetch,
): Promise<ApiResult<ScanResultResponse>> {
  return apiRequest({
    method: "POST",
    path: `/api/scan/${encodeURIComponent(scanSessionId)}/retry-detail`,
    response: ScanResultResponse,
    fetchFn,
  });
}

/** What the results page shows after an answer. */
export type ResultView =
  | { kind: "ready"; result: ScanResultResponse }
  | { kind: "preparing"; delayMs: number }
  | { kind: "detailsFailed" }
  | { kind: "notScored"; path: string }
  | { kind: "expired" }
  | { kind: "signedOut" }
  | { kind: "retryLater"; delayMs: number };

export function resultView(
  answer: ApiResult<ScanResultResponse>,
  scanSessionId: string,
): ResultView {
  if (answer.kind === "network") return { kind: "retryLater", delayMs: pollDelayMs(5) };
  if (answer.kind === "error") {
    if (answer.code === "not_signed_in") return { kind: "signedOut" };
    if (answer.code === "not_found") return { kind: "expired" };
    return { kind: "retryLater", delayMs: pollDelayMs(5) };
  }
  const result = answer.data;
  // The overview is not scored (yet, or it failed): the processing page handles that.
  if (result.status !== "done") return { kind: "notScored", path: processingPath(scanSessionId) };
  switch (result.line_detail.status) {
    case "done":
      return { kind: "ready", result };
    case "failed":
      return { kind: "detailsFailed" };
    case "waiting":
    case "working":
      return { kind: "preparing", delayMs: pollDelayMs(result.retry_after) };
  }
}

/** How a category shows in the left rail and the middle panel. */
export type CategoryState = "open" | "locked" | "noIssues";

export type CategoryRow = {
  category: ScoreCategory;
  score: number;
  flaggedCount: number;
  state: CategoryState;
};

/**
 * The open category is the one line detail opened (line_detail.category). Any other category
 * with flagged lines is locked, as the server sent no lines for it. A category with no flagged
 * line shows "No issues" and no lock, so when all four have none, nothing is locked.
 */
export function categoryRows(result: ScanResultResponse): CategoryRow[] {
  return result.categories.map((item: ResultCategory) => ({
    category: item.category,
    score: item.score,
    flaggedCount: item.flagged_count,
    state:
      item.flagged_count === 0
        ? "noIssues"
        : item.category === result.line_detail.category
          ? "open"
          : "locked",
  }));
}

/** The open category's lines, in CV order. */
export function openLines(result: ScanResultResponse): FlaggedLine[] {
  return [...result.line_detail.lines].sort((a, b) => a.index - b.index);
}

/** How many lines show before "Show N more" (the B3 Open category frame shows three). */
export const LINES_SHOWN_FIRST = 3;

/** "6 issues", "1 issue". */
export function issuesLabel(count: number): string {
  const text = getContent("app/results").leftRail.issues;
  return fillPlaceholders(count === 1 ? text.one : text.other, { count });
}

/** Green from 75, amber below; never red (design tokens, "score ring"). */
export const STRONG_SCORE_FROM = 75;

export function scoreTone(score: number): "strong" | "flagged" {
  return score >= STRONG_SCORE_FROM ? "strong" : "flagged";
}

/** "Experience, Product Designer at Acme", or just "Experience" when the line has no role. */
export function lineMeta(line: {
  section: FlaggedLine["section"];
  role?: string | undefined;
}): string {
  const section = cvSectionName(line.section);
  if (line.role === undefined) return section;
  return fillPlaceholders(getContent("app/results").middleDetail.lineMeta, {
    section,
    role: line.role,
  });
}

/** The CV panel's label: what the highlights show for the selected category, if anything. */
export function cvPanelNote(
  state: CategoryState,
  categoryName: string,
): { kind: "flagged" | "locked"; text: string } | undefined {
  const text = getContent("app/results").cvPanel;
  if (state === "open") {
    return { kind: "flagged", text: fillPlaceholders(text.flaggedIn, { category: categoryName }) };
  }
  if (state === "locked") {
    return {
      kind: "locked",
      text: fillPlaceholders(text.lockedHighlights, { category: categoryName }),
    };
  }
  return undefined;
}
