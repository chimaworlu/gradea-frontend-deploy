import { apiRequest, type ApiResult } from "../api/client";
import {
  ClaimResponse,
  CV_FILE_MAX_BYTES,
  GUEST_TOKEN_HEADER,
  MeResponse,
  SCAN_UPLOAD_FILE_FIELD,
  ScanUploadResponse,
  type AuthUser,
  type CareerLevel,
  type ErrorCode,
} from "../api/shared";
import { errorMessage, fillPlaceholders, getContent } from "../content";

// Rules for the A1 upload page, General analysis (PRD 9.2 and 9.3, Build Plan Phase 2). The
// browser checks the file first for speed only; the server checks it again by its content and
// its answer always wins (SRS Section 8).

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

/** POST /api/scan/general: one file and the optional career level and bot token. */
export function uploadCv(
  file: Blob & { name: string },
  fields: { careerLevel?: CareerLevel; botToken?: string },
  fetchFn?: typeof fetch,
): Promise<ApiResult<ScanUploadResponse>> {
  const form = new FormData();
  form.append(SCAN_UPLOAD_FILE_FIELD, file, file.name);
  if (fields.careerLevel !== undefined) form.append("career_level", fields.careerLevel);
  if (fields.botToken !== undefined) form.append("bot_token", fields.botToken);
  return apiRequest({
    method: "POST",
    path: "/api/scan/general",
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
  | { kind: "wall"; scanSessionId: string; guestToken: string }
  | { kind: "processing"; path: string }
  | { kind: "limit"; resetAt: string }
  | { kind: "fileError"; message: string }
  | { kind: "failed"; message: string };

const FILE_CODES: readonly ErrorCode[] = [
  "file_required",
  "file_too_large",
  "file_type_not_supported",
  "file_unreadable",
  "file_not_english",
];

/**
 * A guest goes to the signup wall with the scan waiting; a signed-in user goes straight to
 * processing (Build Plan Phase 2, decided 19 Nov). The limit popup shows only on
 * scan_limit_reached with its reset_at.
 */
export function uploadOutcome(result: ApiResult<ScanUploadResponse>): UploadOutcome {
  if (result.kind === "ok") {
    const { scan_session_id: scanSessionId, guest } = result.data;
    return guest === null
      ? { kind: "processing", path: processingPath(scanSessionId) }
      : { kind: "wall", scanSessionId, guestToken: guest.token };
  }
  if (result.kind === "network") {
    return { kind: "failed", message: getContent("app/upload").uploadBox.uploadFailed };
  }
  if (result.code === "scan_limit_reached" && result.resetAt !== undefined) {
    return { kind: "limit", resetAt: result.resetAt };
  }
  if (FILE_CODES.includes(result.code)) {
    return { kind: "fileError", message: errorMessage(result.code) };
  }
  return { kind: "failed", message: errorMessage(result.code) };
}
