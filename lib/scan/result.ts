import { apiRequest, type ApiResult } from "../api/client";
import { z } from "zod";
import {
  JobResultResponse,
  ScanResultResponse,
  type CvPanelLine,
  type FlaggedLine,
  type JobKeywordGroup,
  type KeywordGroup,
  type ResultCategory,
  type ScanType,
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

// The same endpoint answers a Job-specific scan with its own shape, told apart by scan_type (SRS
// Section 4).
const AnyResult = z.union([JobResultResponse, ScanResultResponse]);
export type AnyResult = z.infer<typeof AnyResult>;

/** A Job-specific result that is scored, so it has its score. */
export type ScoredJobResult = JobResultResponse & { relevancy_score: number };

export function getScanResult(
  scanSessionId: string,
  fetchFn?: typeof fetch,
): Promise<ApiResult<AnyResult>> {
  return apiRequest({
    method: "GET",
    path: `/api/scan/${encodeURIComponent(scanSessionId)}/result`,
    response: AnyResult,
    fetchFn,
  });
}

/** Only a Job-specific result carries scan_type. */
export function resultScanType(result: AnyResult): ScanType {
  return "scan_type" in result ? result.scan_type : "general";
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
  | { kind: "jobReady"; result: ScoredJobResult }
  | { kind: "preparing"; delayMs: number }
  | { kind: "detailsFailed" }
  | { kind: "notScored"; path: string }
  | { kind: "expired" }
  | { kind: "signedOut" }
  | { kind: "retryLater"; delayMs: number };

export function resultView(answer: ApiResult<AnyResult>, scanSessionId: string): ResultView {
  if (answer.kind === "network") return { kind: "retryLater", delayMs: pollDelayMs(5) };
  if (answer.kind === "error") {
    if (answer.code === "not_signed_in") return { kind: "signedOut" };
    if (answer.code === "not_found") return { kind: "expired" };
    return { kind: "retryLater", delayMs: pollDelayMs(5) };
  }
  const result = answer.data;
  // The overview is not scored (yet, or it failed): the processing page handles that.
  if (result.status !== "done") return { kind: "notScored", path: processingPath(scanSessionId) };
  if ("scan_type" in result) {
    // A Job-specific result has no line detail: done is done. Its score is never made up.
    const { relevancy_score: score } = result;
    return score === null
      ? { kind: "retryLater", delayMs: pollDelayMs(5) }
      : { kind: "jobReady", result: { ...result, relevancy_score: score } };
  }
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

/** A C1 keyword group as shown: its counts and the matched keywords, never a missing one. */
export type KeywordRow = {
  group: JobKeywordGroup["group"];
  matchedCount: number;
  missingCount: number;
  total: number;
  matched: readonly string[];
};

/** The groups to show. A group the job asks nothing of is left out. */
export function keywordRows(groups: readonly JobKeywordGroup[]): KeywordRow[] {
  return groups
    .map((item) => ({
      group: item.group,
      matchedCount: item.matched_count,
      missingCount: item.missing_count,
      total: item.matched_count + item.missing_count,
      matched: item.matched,
    }))
    .filter((row) => row.total > 0);
}

/** The whole job's counts, for the headline and the locked card. */
export function keywordTotals(rows: readonly KeywordRow[]): {
  matched: number;
  missing: number;
  total: number;
} {
  const matched = rows.reduce((sum, row) => sum + row.matchedCount, 0);
  const missing = rows.reduce((sum, row) => sum + row.missingCount, 0);
  return { matched, missing, total: matched + missing };
}

/** A line to tailor as shown: the CV line's own words and place, and the server's reason. */
export type TailorCard = { lineId: string; meta: string; text: string; reason: string };

/** What "Lines to tailor for this job" shows (PRD FR-36). */
export type TailorView = {
  /** Open groups, with their lines in the server's order. Free has at most one. */
  open: Array<{ group: KeywordGroup; cards: TailorCard[] }>;
  /** Locked groups with lines: only their counts were sent. */
  locked: Array<{ group: KeywordGroup; count: number }>;
};

/**
 * The tailor groups joined to the CV by line id, so each card shows the line's own text and its
 * section. A line the CV does not have is left out: a reason is never shown without its line.
 * Undefined when there is no line at all, so the section is hidden.
 */
export function tailorView(result: JobResultResponse): TailorView | undefined {
  const cvLines = new Map(
    result.cv.flatMap((section) => section.lines.map((line) => [line.line_id, line] as const)),
  );
  const open: TailorView["open"] = [];
  const locked: TailorView["locked"] = [];
  for (const item of result.tailor_groups) {
    if (item.locked) {
      if (item.line_count > 0) locked.push({ group: item.group, count: item.line_count });
      continue;
    }
    const cards = item.lines.flatMap((line) => {
      const cvLine = cvLines.get(line.line_id);
      if (cvLine === undefined) return [];
      return [
        { lineId: line.line_id, meta: lineMeta(cvLine), text: cvLine.text, reason: line.reason },
      ];
    });
    if (cards.length > 0) open.push({ group: item.group, cards });
  }
  return open.length === 0 && locked.length === 0 ? undefined : { open, locked };
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

/**
 * What the CV panel shows for a line. Display only; the stored text is unchanged:
 * - a section's heading shows the section's name from the content files in title case
 *   ("Experience", not "EXPERIENCE"); a section the server could not name ("other") keeps its
 *   own words, with an all-capitals heading shown with only its first letter capital;
 * - contact lines show " | " between their parts as " · ", as in the design.
 */
export function cvDisplayText(line: CvPanelLine, isSectionHeading: boolean): string {
  if (isSectionHeading) {
    if (line.section !== "other") return cvSectionName(line.section);
    const own = line.text.trim();
    return own === own.toUpperCase() && own !== own.toLowerCase()
      ? own.charAt(0) + own.slice(1).toLowerCase()
      : own;
  }
  if (line.section === "contact") return line.text.replace(/\s*\|\s*/g, " · ");
  return line.text;
}

// One date in an entry heading: "May 2026", "Sept. 2025", "03/2024" or a bare year.
const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";
const ONE_DATE = `(?:${MONTH}\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4})`;
const RANGE_END = `(?:${ONE_DATE}|Present|Current|Now|Today)`;
// A date or a date range at the very end, after a separator or a gap: "May 2026 to Present",
// "Jan 2024 - Mar 2025", "2025". Anything else is not split.
const TRAILING_DATES = new RegExp(
  `^(.*?\\S)(?:\\s*[,|·]\\s*|\\s+)(${ONE_DATE}(?:\\s*(?:to|-|–|—)\\s*${RANGE_END})?)\\s*$`,
  "i",
);

/** An entry heading split into its title and its trailing date range. */
export type EntryHeading = { title: string; dates: string };

/**
 * Splits an entry heading ("Product Designer | Acme   May 2026 to Present") into the title on
 * the left and the date range on the right, as in the CV highlights frame. Display only: the
 * stored text is unchanged. " | " in the title shows as ", ". When no clear date range ends the
 * line, the whole line shows as it is (undefined here).
 */
export function splitEntryHeading(text: string): EntryHeading | undefined {
  const match = TRAILING_DATES.exec(text.trim());
  const title = match?.[1]?.replace(/\s*\|\s*/g, ", ").replace(/[\s,|·–—-]+$/, "");
  const dates = match?.[2];
  if (title === undefined || dates === undefined || title === "") return undefined;
  return { title, dates };
}

/** The sections whose headings are entries with dates (jobs, projects, studies). */
export function hasDatedEntries(section: CvPanelLine["section"]): boolean {
  return section === "experience" || section === "projects" || section === "education";
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
