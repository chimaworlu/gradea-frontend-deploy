// Generated from gradea-backend src/shared/api-contract.ts. Do not edit here.
// Change the source in gradea-backend and run npm run generate:api.
import { z } from "zod";

// The shared API contract (SRS Section 2, api-contract.md section 1). The single source of the
// shapes the frontend and the backend exchange, plus the shared analytics event list.
// It imports only zod, because `npm run generate:api` copies it as it is into the frontend
// (shared/api.generated.ts here, lib/api/shared.ts there). Never import backend code here.
// Rules that need server data (the common-password list, the database) stay on the server and
// are added on top of these schemas there; they never loosen them.

// ---- Errors (SRS Section 12) ----------------------------------------------------------------

export const ErrorCode = z.enum([
  "validation_failed",
  "bot_check_failed",
  "rate_limited",
  "not_found",
  "internal_error",
  // Sign-up and login (SRS Section 4).
  "email_disposable",
  "email_domain_not_found",
  "email_taken",
  "password_too_short",
  "password_too_long",
  "password_too_common",
  "career_level_required",
  "invalid_credentials",
  "not_signed_in",
  "origin_not_allowed",
  // Claiming a guest scan (SRS Section 5). One code for every reason, so it never shows which.
  "guest_session_invalid",
  // Setting a new password from an emailed link. One code for every reason the link fails.
  "reset_token_invalid",
  // Google sign-in (SRS Section 5).
  "google_not_configured",
  "google_pending_invalid",
  "wrong_password",
  // Uploading a CV (SRS Section 8, PRD Section 9.6).
  "file_required",
  "file_too_large",
  "file_type_not_supported",
  "file_unreadable",
  "file_not_english",
  "extraction_failed",
  // The Free monthly limit (SRS Section 7). The answer also carries `reset_at`.
  "scan_limit_reached",
  // POST /api/scan/:id/retry-detail before the scan has its scores.
  "scan_not_scored",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

// The HTTP statuses each code is sent with. validation_failed is 400, or 413 when an auth body
// is too large, or 415 when the body is not JSON (SRS Section 12).
export const ERROR_STATUSES = {
  validation_failed: [400, 413, 415],
  bot_check_failed: [400],
  rate_limited: [429],
  not_found: [404],
  internal_error: [500],
  email_disposable: [400],
  email_domain_not_found: [400],
  email_taken: [409],
  password_too_short: [400],
  password_too_long: [400],
  password_too_common: [400],
  career_level_required: [400],
  invalid_credentials: [401],
  not_signed_in: [401],
  origin_not_allowed: [403],
  guest_session_invalid: [404],
  reset_token_invalid: [400],
  google_not_configured: [503],
  google_pending_invalid: [401],
  wrong_password: [401],
  file_required: [400],
  file_too_large: [413],
  file_type_not_supported: [415],
  file_unreadable: [422],
  file_not_english: [422],
  extraction_failed: [503],
  scan_limit_reached: [403],
  scan_not_scored: [409],
} as const satisfies Record<ErrorCode, readonly number[]>;

// Every error from every route has this body. `message` is safe to show, but the frontend
// shows its own wording chosen by `code`.
// `reset_at` is set only with scan_limit_reached: when the monthly allowance starts again (the
// 1st of next month, 00:00 Lagos time), so the upgrade modal can show the date.
export const ErrorResponse = z.object({
  code: ErrorCode,
  message: z.string(),
  reset_at: z.iso.datetime().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

// ---- Shared enums (SRS Section 3) -----------------------------------------------------------

export const CareerLevel = z.enum(["entry", "mid", "senior", "executive"]);
export type CareerLevel = z.infer<typeof CareerLevel>;

// The sections of a CV, the four General Analysis categories (PRD Section 12.1) and the issue
// types a flagged line can have. Used by lib/ai/ and by the results answer.
export const CvSection = z.enum([
  "contact",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "other",
]);
export type CvSection = z.infer<typeof CvSection>;

export const ScoreCategory = z.enum([
  "impact_achievements",
  "brevity_style",
  "leadership_growth",
  "ats_formatting",
]);
export type ScoreCategory = z.infer<typeof ScoreCategory>;

// Every issue type a flagged line can have. Each belongs to exactly one category
// (CATEGORY_ISSUES below), and a flagged line always uses a type of its own category.
export const LineIssue = z.enum([
  // impact_achievements
  "no_numbers",
  "weak_verb",
  "duty_not_result",
  "vague_claim",
  // brevity_style
  "too_long",
  "filler_words",
  "cliche",
  "spelling_grammar",
  "repetition",
  // brevity_style, set by Gradea's own code checks (22 Nov), never by the AI
  "repeated_phrase",
  "repeated_opener",
  "bullet_too_long",
  "first_person",
  "mixed_tenses",
  // leadership_growth
  "no_leadership_signal",
  "no_growth_shown",
  "no_ownership",
  // ats_formatting
  "date_format_inconsistent",
  "unusual_symbols",
  "contact_details_unclear",
  "section_name_nonstandard",
  "layout_not_machine_readable",
  "role_details_missing",
  // ats_formatting, set by Gradea's own code checks (22 Nov), never by the AI
  "link_without_address",
  "date_ambiguous",
]);
export type LineIssue = z.infer<typeof LineIssue>;

// The issue types of each category (decided 21 Nov). A test checks these lists together are
// exactly LineIssue, with no type in two categories.
export const CATEGORY_ISSUES = {
  impact_achievements: ["no_numbers", "weak_verb", "duty_not_result", "vague_claim"],
  brevity_style: [
    "too_long",
    "filler_words",
    "cliche",
    "spelling_grammar",
    "repetition",
    "repeated_phrase",
    "repeated_opener",
    "bullet_too_long",
    "first_person",
    "mixed_tenses",
  ],
  leadership_growth: ["no_leadership_signal", "no_growth_shown", "no_ownership"],
  ats_formatting: [
    "date_format_inconsistent",
    "unusual_symbols",
    "contact_details_unclear",
    "section_name_nonstandard",
    "layout_not_machine_readable",
    "role_details_missing",
    "link_without_address",
    "date_ambiguous",
  ],
} as const satisfies Record<ScoreCategory, readonly LineIssue[]>;

// The issue types only Gradea's own code checks set, exactly and with no AI (21 and 22 Nov).
// The AI is never offered them, and a flag of one from the AI is dropped.
export const CODE_CHECK_ISSUES: readonly LineIssue[] = [
  "date_format_inconsistent",
  // Section heading names are checked against a fixed list (22 Nov, src/config/section-headings.ts).
  "section_name_nonstandard",
  "repeated_phrase",
  "repeated_opener",
  "bullet_too_long",
  "first_person",
  "mixed_tenses",
  "link_without_address",
  "date_ambiguous",
];

// ATS issues in the uploaded file itself, found by Gradea's own code with no AI (22 Nov, PRD
// Section 12.1). They belong to ats_formatting, are not tied to a CV line, and each counts as one
// issue in that category's flagged_count and score.
//   columns        text laid out in columns side by side
//   tables         text in a table (a ruled grid, or many aligned cells)
//   images         a picture or graphic bigger than an icon
//   text_boxes     text in a text box (DOCX)
//   header_footer  contact details in the page header or footer (PDF), or any text there (DOCX)
//   fonts          many font families, or a decorative one (PDF)
export const FileIssue = z.enum([
  "columns",
  "tables",
  "images",
  "text_boxes",
  "header_footer",
  "fonts",
]);
export type FileIssue = z.infer<typeof FileIssue>;

export function issueBelongsTo(category: ScoreCategory, issue: LineIssue): boolean {
  const allowed: readonly LineIssue[] = CATEGORY_ISSUES[category];
  return allowed.includes(issue);
}

export const SubscriptionStatus = z.enum(["free", "pro", "grace"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const SubscriptionPlan = z.enum(["day_pass", "weekly", "monthly", "three_month"]);
export type SubscriptionPlan = z.infer<typeof SubscriptionPlan>;

export const Region = z.enum(["nigeria", "international"]);
export type Region = z.infer<typeof Region>;

export const Role = z.enum(["user", "admin"]);
export type Role = z.infer<typeof Role>;

// ---- Field rules ----------------------------------------------------------------------------

export const EMAIL_MAX_LENGTH = 254;
// Cloudflare Turnstile tokens are at most 2048 characters.
export const BOT_TOKEN_MAX_LENGTH = 2048;
// Login and link only bound the size; the sign-up rules decide what a valid password is.
export const LOGIN_PASSWORD_MAX_LENGTH = 1024;
// Long enough for any real reset token; anything longer is refused without hashing it.
export const RESET_TOKEN_MAX_LENGTH = 256;

// Password rules (SRS Section 5): at least 8 characters, at most 72 bytes, no symbol or capital
// rules. The password is never trimmed or changed; spaces count like any other character.
export const PASSWORD_MIN_CHARACTERS = 8;
// bcrypt only reads the first 72 bytes, so anything longer would be silently ignored.
// Counted in UTF-8 bytes, not characters: "é" is 2 bytes.
export const PASSWORD_MAX_BYTES = 72;

// Characters as a person sees them: an accented letter or an emoji counts as one.
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

export function passwordCharacterCount(password: string): number {
  return Array.from(graphemes.segment(password)).length;
}

const utf8 = new TextEncoder();

export function passwordByteLength(password: string): number {
  return utf8.encode(password).length;
}

const trim = (value: unknown) => (typeof value === "string" ? value.trim() : value);

// Trimmed and lowercased before it is checked, so " Foo@X.com" and "foo@x.com" are one account.
export const Email = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.email().max(EMAIL_MAX_LENGTH),
);

// The first password rule a new password breaks, as an error code, checked in this order.
// The server adds one more rule after these: the common-password list (password_too_common).
export function newPasswordProblem(password: string): ErrorCode | undefined {
  if (passwordCharacterCount(password) < PASSWORD_MIN_CHARACTERS) return "password_too_short";
  if (passwordByteLength(password) > PASSWORD_MAX_BYTES) return "password_too_long";
  // bcrypt stops reading at a zero byte, so a password containing one is refused outright.
  if (password.includes("\0")) return "validation_failed";
  return undefined;
}

// Each broken rule reports its error code as the issue message.
export const NewPassword = z.string().superRefine((password, ctx) => {
  const problem = newPasswordProblem(password);
  if (problem !== undefined) ctx.addIssue({ code: "custom", message: problem });
});

// Required when the bot check is on. The server checks that, because it knows the setting.
const BotToken = z.preprocess(trim, z.string().min(1).max(BOT_TOKEN_MAX_LENGTH)).optional();

// The `{ ok: true }` answer of routes that return nothing else.
export const OkResponse = z.strictObject({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponse>;

// ---- Health ---------------------------------------------------------------------------------

// GET /health
export const HealthResponse = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof HealthResponse>;

// ---- Auth (SRS Section 4) -------------------------------------------------------------------

// What the API shows about the signed-in user. Never the password hash, the Google id, the
// token version or the consent time. strictObject makes a stray field fail loudly.
export const AuthUser = z.strictObject({
  id: z.string(),
  email: z.string(),
  career_level: CareerLevel,
  subscription_status: SubscriptionStatus,
  subscription_plan: SubscriptionPlan.nullable(),
  subscription_expires_at: z.iso.datetime().nullable(),
  grace_until: z.iso.datetime().nullable(),
  region: Region,
  role: Role,
  created_at: z.iso.datetime(),
});
export type AuthUser = z.infer<typeof AuthUser>;

// Answer of sign-up (201), login, GET /api/auth/me and Google complete (201).
export const AuthUserResponse = z.strictObject({ user: AuthUser });
export type AuthUserResponse = z.infer<typeof AuthUserResponse>;

// POST /api/auth/signup. Inputs are trimmed (never the password) and the email lowercased;
// unknown fields are refused.
export const SignupRequest = z.strictObject({
  email: Email,
  password: NewPassword,
  career_level: z.preprocess(trim, z.enum(CareerLevel.options, { error: "career_level_required" })),
  // The consent line on the sign-up form must be ticked.
  consent: z.literal(true),
  bot_token: BotToken,
});
export type SignupRequest = z.input<typeof SignupRequest>;

// POST /api/auth/login
export const LoginRequest = z.strictObject({
  email: Email,
  password: z.string().min(1).max(LOGIN_PASSWORD_MAX_LENGTH),
});
export type LoginRequest = z.input<typeof LoginRequest>;
export const LoginResponse = AuthUserResponse;
export type LoginResponse = z.infer<typeof LoginResponse>;

// POST /api/auth/logout (no body)
export const LogoutResponse = OkResponse;
export type LogoutResponse = z.infer<typeof LogoutResponse>;

// GET /api/auth/me
export const MeResponse = AuthUserResponse;
export type MeResponse = z.infer<typeof MeResponse>;

// POST /api/auth/password-reset, step 1: send a reset link. Always answers 200 { ok: true }.
export const PasswordResetRequest = z.strictObject({
  email: Email,
  bot_token: BotToken,
});
export type PasswordResetRequest = z.input<typeof PasswordResetRequest>;

// POST /api/auth/password-reset, step 2: set the new password with the token from the link.
export const PasswordResetComplete = z.strictObject({
  // Never trimmed: the token is used exactly as it came in the link.
  token: z.string().max(RESET_TOKEN_MAX_LENGTH),
  // The same rules and error codes as sign-up.
  password: NewPassword,
});
export type PasswordResetComplete = z.input<typeof PasswordResetComplete>;

export const PasswordResetResponse = OkResponse;
export type PasswordResetResponse = z.infer<typeof PasswordResetResponse>;

// ---- Google sign-in (SRS Section 4 and 5) ---------------------------------------------------

// Where the API sends the browser after Google, on the site (APP_URL). The frontend serves them.
export const GOOGLE_FRONTEND_PATHS = {
  signedIn: "/",
  finishSignup: "/signup/google",
  confirmLink: "/link-google",
  failed: "/login?error=google_failed",
  cancelled: "/login?error=google_cancelled",
} as const;

// GET /api/auth/google/callback, sent by Google, not by the frontend. Google adds its own
// fields (scope, authuser, prompt, iss), so unknown fields are allowed.
export const GoogleCallbackQuery = z.object({
  code: z.string().min(1).max(2048).optional(),
  state: z.string().min(1).max(256).optional(),
  error: z.string().max(256).optional(),
});

// GET /api/auth/google/pending
export const GooglePendingResponse = z.strictObject({
  flow: z.enum(["signup", "link"]),
  // Shown on the next screen ("chima@example.com already has a Gradea account").
  email: z.string(),
});
export type GooglePendingResponse = z.infer<typeof GooglePendingResponse>;

// POST /api/auth/google/complete: career level and consent, with the sign-up rules and codes.
// Answers 201 AuthUserResponse.
export const GoogleCompleteRequest = SignupRequest.pick({ career_level: true, consent: true });
export type GoogleCompleteRequest = z.input<typeof GoogleCompleteRequest>;

// POST /api/auth/google/link
export const GoogleLinkRequest = z.strictObject({
  password: z.string().min(1).max(LOGIN_PASSWORD_MAX_LENGTH),
});
export type GoogleLinkRequest = z.input<typeof GoogleLinkRequest>;

// Answer of POST /api/auth/google/link and POST /api/auth/google/cancel.
export const GoogleOkResponse = OkResponse;
export type GoogleOkResponse = z.infer<typeof GoogleOkResponse>;

// ---- Scan (SRS Section 4) -------------------------------------------------------------------

// The header that carries the guest scan token on POST /api/scan/:id/claim.
export const GUEST_TOKEN_HEADER = "x-guest-token";

// POST /api/scan/:id/claim. Session ids are cuids; anything else is refused like an unknown id.
export const ScanIdParams = z.strictObject({ id: z.string().regex(/^[a-z0-9]{1,64}$/) });
export type ScanIdParams = z.infer<typeof ScanIdParams>;
export const ClaimParams = ScanIdParams;
export type ClaimParams = ScanIdParams;

// 200 as soon as the scan is attached. Scoring then runs in the background; the processing
// screen polls GET /api/scan/:id/status. A Free user at the monthly limit gets 403
// scan_limit_reached with reset_at instead, and keeps the scan (status waiting).
export const ClaimResponse = OkResponse;
export type ClaimResponse = z.infer<typeof ClaimResponse>;

// Where a scan's scoring is. failed means scoring failed after its retry: the upload is kept
// and the person can retry with POST /api/scan/:id/retry; no scan was used.
export const ScanStatus = z.enum(["waiting", "working", "done", "failed"]);
export type ScanStatus = z.infer<typeof ScanStatus>;

// Why a scan is failed: the AI step failed twice, or the monthly limit was reached by the time
// scoring finished (two scans at once).
export const ScanFailure = z.enum(["scoring_failed", "scan_limit_reached"]);
export type ScanFailure = z.infer<typeof ScanFailure>;

// GET /api/scan/:id/status, and the answer of POST /api/scan/:id/retry. retry_after (seconds,
// also sent as the Retry-After header) is how long to wait before asking again; null once the
// scan is done or failed. Signed-in owner only.
export const ScanStatusResponse = z.strictObject({
  scan_session_id: z.string(),
  status: ScanStatus,
  retry_after: z.int().min(1).nullable(),
  failure: ScanFailure.nullable(),
});
export type ScanStatusResponse = z.infer<typeof ScanStatusResponse>;

// GET /api/scan/:id/result, and the answer of POST /api/scan/:id/retry-detail. Signed-in owner
// only. It answers as soon as the overview is scored; line detail (the flagged lines of the one
// open category) follows, with its own status, so the screen polls this every retry_after
// seconds until line_detail is done or failed. Tier gating is done here, never in the browser
// (PRD Section 12.1): a locked category carries only its score and issue count, never a line.
export const ResultCategory = z.strictObject({
  category: ScoreCategory,
  score: z.int().min(0).max(100),
  flagged_count: z.int().min(0),
  locked: z.boolean(),
});
export type ResultCategory = z.infer<typeof ResultCategory>;

// The job or project a line belongs to, as a short label such as "Product Designer at Acme".
// Built in code from the entry's own heading line above it, never by the AI. Left out when the
// entry has no clear heading, and on lines outside an experience or project entry.
export const ROLE_LABEL_MAX_LENGTH = 80;
const RoleLabel = z.string().min(1).max(ROLE_LABEL_MAX_LENGTH);

// A flagged line of the open category. index and index_in_section place it on the CV (from 0).
export const FlaggedLine = z.strictObject({
  line_id: z.string(),
  section: CvSection,
  index: z.int().min(0),
  index_in_section: z.int().min(0),
  text: z.string(),
  role: RoleLabel.optional(),
  issue: LineIssue,
  reason: z.string(),
});
export type FlaggedLine = z.infer<typeof FlaggedLine>;

// An ATS issue in the file itself, sent only when ats_formatting is the open category. It marks
// no CV line.
export const FlaggedFileIssue = z.strictObject({
  issue: FileIssue,
  reason: z.string(),
});
export type FlaggedFileIssue = z.infer<typeof FlaggedFileIssue>;

// One line of the CV panel, in document order. It is the person's own CV, so every line is sent
// on every tier, with its personal details as written. `flagged` is true only for a flagged line
// of the open category once line detail is done; a line flagged only in a locked category is
// never marked, so the panel never shows what a locked category found (PRD Section 12.1).
export const CvLineKind = z.enum(["heading", "bullet", "text"]);
export type CvLineKind = z.infer<typeof CvLineKind>;
export const CvPanelLine = z.strictObject({
  line_id: z.string(),
  section: CvSection,
  index_in_section: z.int().min(0),
  kind: CvLineKind,
  text: z.string(),
  role: RoleLabel.optional(),
  flagged: z.boolean(),
});
export type CvPanelLine = z.infer<typeof CvPanelLine>;

// The lines grouped by section, each run of lines in one section as one group, in CV order.
export const CvPanelSection = z.strictObject({
  section: CvSection,
  lines: z.array(CvPanelLine).min(1),
});
export type CvPanelSection = z.infer<typeof CvPanelSection>;

// Checks the CV passes, verified in code from the stored CV with no AI call (PRD Section 12.1).
// Ids only: the wording is in the frontend. A check that cannot be verified, or that a kept
// flagged line contradicts, is never listed.
//   contact_details_present    an email and a phone number in the contact lines
//   standard_section_headings  every section after the contact lines opens with a heading on the
//                              standard list (src/config/section-headings.ts)
//   consistent_date_format     two or more dated roles, all in one date style
//   every_role_has_dates       every job in experience has a start date
export const PassedCheck = z.enum([
  "contact_details_present",
  "standard_section_headings",
  "consistent_date_format",
  "every_role_has_dates",
]);
export type PassedCheck = z.infer<typeof PassedCheck>;

export const ScanResultResponse = z.strictObject({
  scan_session_id: z.string(),
  // The scan's own status (scoring of the overview), as on GET /api/scan/:id/status.
  status: ScanStatus,
  failure: ScanFailure.nullable(),
  career_level_used: CareerLevel.nullable(),
  // Null and empty until the overview is scored.
  overall_score: z.int().min(0).max(100).nullable(),
  categories: z.array(ResultCategory),
  line_detail: z.strictObject({
    status: ScanStatus,
    // The open category, once scored: the lowest scoring with at least one flagged issue (ties
    // in the fixed category order), or the lowest scoring when none has one (zero lines).
    category: ScoreCategory.nullable(),
    // Only the open category's lines, only once line detail is done.
    lines: z.array(FlaggedLine),
    // The file's own ATS issues (22 Nov), only when ats_formatting is the open category and line
    // detail is done; empty otherwise. Each one also counts in that category's flagged_count.
    file_issues: z.array(FlaggedFileIssue),
    // One short plain sentence about the open category's flagged lines, from the same line
    // detail answer, once line detail is done. Null when that category has no flagged line or
    // the server's checks dropped it. A locked category never has one.
    summary: z.string().min(1).nullable(),
  }),
  // The whole CV for the CV panel, once the overview is scored (empty before).
  cv: z.array(CvPanelSection),
  // Once line detail is done (empty before).
  passed_checks: z.array(PassedCheck),
  // Seconds to wait before asking again while the overview or line detail is still running;
  // null once both are settled. Also sent as the Retry-After header.
  retry_after: z.int().min(1).nullable(),
});
export type ScanResultResponse = z.infer<typeof ScanResultResponse>;

// POST /api/scan/general. A multipart form (not JSON) with exactly one file field and these
// text fields. The file is a PDF or DOCX of at most CV_FILE_MAX_BYTES; the server decides the
// type from the file's content, not its name.
export const CV_FILE_MAX_BYTES = 2 * 1024 * 1024;
export const SCAN_UPLOAD_FILE_FIELD = "file";
export const ScanUploadFields = z.strictObject({
  // Optional. A guest chooses it on the signup wall; a signed-in user defaults to their stored
  // level, and this override applies to this scan only (FR-24).
  career_level: z.preprocess(trim, CareerLevel).optional(),
  // Required for guests when the bot check is on. Signed-in users skip it.
  bot_token: BotToken,
});
export type ScanUploadFields = z.input<typeof ScanUploadFields>;

// 201. `guest` is set only for an upload without a login: the token is shown this once and is
// sent back in GUEST_TOKEN_HEADER to claim the scan after signup, before `expires_at`.
export const ScanUploadResponse = z.strictObject({
  scan_session_id: z.string(),
  guest: z.strictObject({ token: z.string(), expires_at: z.iso.datetime() }).nullable(),
});
export type ScanUploadResponse = z.infer<typeof ScanUploadResponse>;

// ---- Usage (SRS Section 7) ------------------------------------------------------------------

// One allowance for this month. limit and remaining are null on an active PRO plan (no monthly
// counter). remaining is never below 0.
export const UsageAllowance = z.strictObject({
  used: z.int().min(0),
  limit: z.int().min(0).nullable(),
  remaining: z.int().min(0).nullable(),
});
export type UsageAllowance = z.infer<typeof UsageAllowance>;

// GET /api/usage. Signed-in only, for the caller's own account. The current calendar month in
// Lagos time, counted exactly as the scan limit counts it. reset_at is the 1st of next month,
// 00:00 Lagos time. Never cached.
export const UsageResponse = z.strictObject({
  general: UsageAllowance,
  job_specific: UsageAllowance,
  reset_at: z.iso.datetime(),
});
export type UsageResponse = z.infer<typeof UsageResponse>;

// ---- Analytics (PRD Section 19, analytics.md) -----------------------------------------------

// Every event name. Names are object_action (analytics.md section 1), except `$pageview`,
// which PostHog sends itself on each page load. Add a new event here first.
// The account events are sent by the backend, identified by the internal user id only.
export const AnalyticsEventName = z.enum([
  "$pageview",
  "account_signed_up",
  "account_logged_in",
  "password_reset_completed",
  "google_linked",
]);
export type AnalyticsEventName = z.infer<typeof AnalyticsEventName>;

// The only properties each event may carry. Any other property is dropped before sending.
// `satisfies` makes a missing or an extra event a type error.
export const ANALYTICS_EVENTS = {
  $pageview: [],
  account_signed_up: ["method"],
  account_logged_in: ["method"],
  password_reset_completed: [],
  google_linked: [],
} as const satisfies Record<AnalyticsEventName, readonly string[]>;

// How the person signed up or logged in.
export const AccountMethod = z.enum(["email", "google"]);
export type AccountMethod = z.infer<typeof AccountMethod>;

// The allowed values of each account event's properties. z.object drops any other property.
export const AccountEvent = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("account_signed_up"),
    properties: z.object({ method: AccountMethod }),
  }),
  z.object({
    event: z.literal("account_logged_in"),
    properties: z.object({ method: AccountMethod }),
  }),
  z.object({ event: z.literal("password_reset_completed"), properties: z.object({}) }),
  z.object({ event: z.literal("google_linked"), properties: z.object({}) }),
]);
export type AccountEvent = z.infer<typeof AccountEvent>;
