import { apiRequest, type ApiResult } from "../api/client";
import {
  ClaimResponse,
  CV_FILE_MAX_BYTES,
  GUEST_TOKEN_HEADER,
  JobDescription,
  MeResponse,
  SCAN_UPLOAD_FILE_FIELD,
  ScanUploadResponse,
  type AuthUser,
  type CareerLevel,
  type ErrorCode,
  type ScanType,
} from "../api/shared";
import { errorMessage, fillPlaceholders, getContent } from "../content";

// Rules for the A1 upload page, General and Job-specific (PRD 9.2, 9.3 and 12.2, Build Plan
// Phases 2 and 3). The browser checks the file and the job description first for speed only; the
// server checks them again and its answer always wins (SRS Section 8).

/** The two kinds of scan, from the shared API file. smart_target is Job-specific. */
export type { ScanType };

/** The job description codes of POST /api/scan/smart-target, shown under the text area. */
export const JOB_DESCRIPTION_CODES = [
  "job_description_required",
  "job_description_too_short",
  "job_description_too_long",
] as const;
export type JobDescriptionCode = (typeof JOB_DESCRIPTION_CODES)[number];

/**
 * The pasted text checked with the API's own schema, so the limits (100 to 15,000 characters,
 * PRD 12.2) are never written twice. The text lives in the page's memory and in this one request
 * only: never in browser storage, a log, an event or the address (PRD FR-54).
 */
export function checkJobDescription(
  text: string,
): { kind: "ok"; text: string } | { kind: "problem"; code: JobDescriptionCode } {
  const parsed = JobDescription.safeParse(text);
  if (parsed.success) return { kind: "ok", text: parsed.data };
  const found = parsed.error.issues[0]?.message;
  const code = JOB_DESCRIPTION_CODES.find((known) => known === found);
  if (code === undefined) throw new Error("Unknown job description problem.");
  return { kind: "problem", code };
}

/** "Match my CV" for a guest on Job-specific, otherwise "Scan my CV" (A1 dev notes). */
export function scanButtonLabel(viewer: Viewer, scanType: ScanType): string {
  const text = getContent("app/upload").scanButton;
  return viewer.kind === "guest" && scanType === "smart_target"
    ? text.guestJobSpecific
    : text.default;
}

/** Where the processing screen lives for one scan (B1, built in Part 2). */
export function processingPath(scanSessionId: string): string {
  return `/scan/${encodeURIComponent(scanSessionId)}`;
}

/** Where a user who signs up on A4, with no scan waiting, lands (Build Plan Phase 2). */
export const UPLOAD_PATH = "/upload";

const ACCEPTED = [
  { extension: ".pdf", type: "application/pdf" },
  {
    extension: ".docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
] as const;

/** The value of the file input's accept attribute. */
export const ACCEPT_ATTRIBUTE = ACCEPTED.flatMap(({ extension, type }) => [extension, type]).join(
  ",",
);

/** A file problem the browser can see before sending. */
export type FileProblem = "several_files" | "file_type_not_supported" | "file_too_large";

/** The facts the checks need, so they work on a File or on a plain object in tests. */
export type FileFacts = { name: string; type: string; size: number };

function isAcceptedType(file: FileFacts): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED.some(({ extension, type }) => name.endsWith(extension) || file.type === type);
}

/** The one file to upload, or the first problem: several files, wrong type, then too large. */
export function checkFiles<F extends FileFacts>(
  files: readonly F[],
): { kind: "ok"; file: F } | { kind: "problem"; problem: FileProblem } {
  const [file] = files;
  if (files.length !== 1 || file === undefined) {
    return { kind: "problem", problem: "several_files" };
  }
  if (!isAcceptedType(file)) return { kind: "problem", problem: "file_type_not_supported" };
  if (file.size > CV_FILE_MAX_BYTES) return { kind: "problem", problem: "file_too_large" };
  return { kind: "ok", file };
}

/** The wording for a file problem, from the content files. */
export function fileProblemMessage(problem: FileProblem): string {
  if (problem === "several_files") return getContent("app/upload").uploadBox.severalFiles;
  return errorMessage(problem);
}

/** A file size as the design shows it, for example "412 KB" or "1.4 MB". */
export function fileSizeLabel(bytes: number): string {
  const units = getContent("app/upload").fileSize;
  const megabyte = 1024 * 1024;
  if (bytes < megabyte) {
    return fillPlaceholders(units.kb, { value: Math.max(1, Math.round(bytes / 1024)) });
  }
  const value = (bytes / megabyte).toFixed(1).replace(/\.0$/, "");
  return fillPlaceholders(units.mb, { value });
}

/** "PDF or DOCX, up to 2MB", with the size from the shared contract. */
export function uploadHelperText(): string {
  const megabytes = CV_FILE_MAX_BYTES / (1024 * 1024);
  return fillPlaceholders(getContent("app/upload").uploadBox.helper, { maxSize: `${megabytes}MB` });
}

/**
 * The reset date in the limit popup, for example "1 Nov". reset_at is the 1st of next month at
 * 00:00 Lagos time, so it is shown in Africa/Lagos time, never the browser's (SRS Section 7).
 */
export function resetDateLabel(resetAt: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(resetAt));
}

/** Who is looking at the page, from one GET /api/auth/me on load. */
export type Viewer = { kind: "guest" } | { kind: "signedIn"; user: AuthUser };

/** Any answer other than a user counts as a guest: the server still checks every upload. */
export function viewerFrom(result: ApiResult<MeResponse>): Viewer {
  return result.kind === "ok" ? { kind: "signedIn", user: result.data.user } : { kind: "guest" };
}

export function fetchViewer(fetchFn?: typeof fetch): Promise<ApiResult<MeResponse>> {
  return apiRequest({ method: "GET", path: "/api/auth/me", response: MeResponse, fetchFn });
}

/**
 * POST /api/scan/general: one file and the optional career level and bot token. With a job
 * description it is POST /api/scan/smart-target: the same form with that one text field more.
 */
export function uploadCv(
  file: Blob & { name: string },
  fields: { careerLevel?: CareerLevel; botToken?: string; jobDescription?: string },
  fetchFn?: typeof fetch,
): Promise<ApiResult<ScanUploadResponse>> {
  const form = new FormData();
  form.append(SCAN_UPLOAD_FILE_FIELD, file, file.name);
  if (fields.careerLevel !== undefined) form.append("career_level", fields.careerLevel);
  if (fields.botToken !== undefined) form.append("bot_token", fields.botToken);
  if (fields.jobDescription !== undefined) form.append("job_description", fields.jobDescription);
  return apiRequest({
    method: "POST",
    path: fields.jobDescription === undefined ? "/api/scan/general" : "/api/scan/smart-target",
    form,
    response: ScanUploadResponse,
    fetchFn,
  });
}

/**
 * POST /api/scan/:id/claim after the guest signs up on the wall. The guest token is kept only
 * in the page's memory and sent once, in its header, never in the address (SRS Section 5).
 */
export function claimScan(
  scanSessionId: string,
  guestToken: string,
  fetchFn?: typeof fetch,
): Promise<ApiResult<ClaimResponse>> {
  return apiRequest({
    method: "POST",
    path: `/api/scan/${encodeURIComponent(scanSessionId)}/claim`,
    headers: { [GUEST_TOKEN_HEADER]: guestToken },
    response: ClaimResponse,
    fetchFn,
  });
}

/** What the page shows after an upload answer. */
export type UploadOutcome =
  | { kind: "wall"; scanSessionId: string; guestToken: string; expiresAt: string }
  | { kind: "processing"; path: string; scanSessionId: string }
  | { kind: "limit"; resetAt: string }
  | { kind: "fileError"; message: string }
  | { kind: "jobDescriptionError"; code: JobDescriptionCode }
  | { kind: "scanError"; code: ScanErrorCode }
  | { kind: "failed"; message: string };

/** Problems the browser could have caught: shown under the upload box (A1 error frames). */
const FILE_CODES: readonly ErrorCode[] = [
  "file_required",
  "file_too_large",
  "file_type_not_supported",
];

/**
 * The server read the file and could not use it: shown as the B2 error screen, with the file
 * kept on the page so "Try again" can send it once more where that helps (extraction_failed).
 */
export const SCAN_ERROR_CODES = [
  "file_unreadable",
  "file_not_english",
  "extraction_failed",
] as const;
export type ScanErrorCode = (typeof SCAN_ERROR_CODES)[number];

export function isScanErrorCode(code: ErrorCode): code is ScanErrorCode {
  return SCAN_ERROR_CODES.some((known) => known === code);
}

/**
 * A guest goes to the signup wall with the scan waiting; a signed-in user goes straight to
 * processing (Build Plan Phase 2, decided 19 Nov). The limit popup shows only on
 * scan_limit_reached with its reset_at.
 */
export function uploadOutcome(result: ApiResult<ScanUploadResponse>): UploadOutcome {
  if (result.kind === "ok") {
    const { scan_session_id: scanSessionId, guest } = result.data;
    return guest === null
      ? { kind: "processing", path: processingPath(scanSessionId), scanSessionId }
      : { kind: "wall", scanSessionId, guestToken: guest.token, expiresAt: guest.expires_at };
  }
  if (result.kind === "network") {
    return { kind: "failed", message: getContent("app/upload").uploadBox.uploadFailed };
  }
  if (result.code === "scan_limit_reached" && result.resetAt !== undefined) {
    return { kind: "limit", resetAt: result.resetAt };
  }
  if (isScanErrorCode(result.code)) return { kind: "scanError", code: result.code };
  if (FILE_CODES.includes(result.code)) {
    return { kind: "fileError", message: errorMessage(result.code) };
  }
  const jobCode = JOB_DESCRIPTION_CODES.find((known) => known === result.code);
  if (jobCode !== undefined) return { kind: "jobDescriptionError", code: jobCode };
  return { kind: "failed", message: errorMessage(result.code) };
}

/** What follows a claim: processing, the limit popup, D1, or the normal upload page. */
export type ClaimOutcome =
  | { kind: "processing"; path: string; scanSessionId: string }
  | { kind: "limit"; resetAt: string }
  | { kind: "expired" }
  | { kind: "uploadPage" };

/**
 * Claimed: scoring runs and the processing screen follows it. At the Free limit the scan stays
 * attached and waiting, and the limit popup shows (SRS Section 4). The scan gone or past its
 * 30 minutes (guest_session_invalid, the one answer for every such case) shows D1. Anything
 * else (for example no connection) leaves the new Free user on the upload page.
 */
export function claimOutcome(
  result: ApiResult<ClaimResponse>,
  scanSessionId: string,
): ClaimOutcome {
  if (result.kind === "ok") {
    return { kind: "processing", path: processingPath(scanSessionId), scanSessionId };
  }
  if (
    result.kind === "error" &&
    result.code === "scan_limit_reached" &&
    result.resetAt !== undefined
  ) {
    return { kind: "limit", resetAt: result.resetAt };
  }
  if (result.kind === "error" && result.code === "guest_session_invalid")
    return { kind: "expired" };
  return { kind: "uploadPage" };
}
