# Gradea — System Requirements Specification (SRS)

**Companion document to:** Gradea PRD v2

---

## 1. Introduction & Purpose

This System Requirements Specification (SRS) translates the Gradea Product Requirements Document (PRD) into the technical specifications needed to design, build, and test the system. It defines the architecture, data model, API contracts, integration behavior, and technical constraints required to deliver the MVP defined in the PRD.

This document assumes the PRD as the source of truth for product behavior, scope, and business rules. Where a technical decision requires interpreting or extending a PRD decision (for example, exact data retention mechanics, or API error shapes), that interpretation is made explicit here rather than left implicit.

Intended audience: engineers and designers building Gradea, and the founder, for review and sign-off before implementation begins.

## 2. System Overview & Architecture

Gradea is built as **two apps in two repositories**: `gradea-frontend` (Next.js) and `gradea-backend` (a standalone API server), both in the `usegradea` GitHub organization, with **TypeScript** throughout, **PostgreSQL** as the primary datastore, and **Prisma** as the ORM (backend only). They talk only through the backend's HTTP API. This keeps the API reusable by the planned mobile app (PRD Section 21, Mobile app direction).

**Technology choices (locked 13 Nov).** Backend: Node 26.13.0 (exact version, set in `engines`), npm, TypeScript in strict mode, **Fastify 5** as the HTTP framework (with `@fastify/cors` for the allowed site origin and `@fastify/rate-limit` for per-IP limits), **Zod** for request and environment validation, **Prisma 7** with PostgreSQL 18 (Prisma 7 also needs the `@prisma/adapter-pg` and `pg` packages before any endpoint reads or writes the database), **Vitest** for tests, **ESLint** (with typescript-eslint) and **Prettier** for code checks and formatting, and `tsx` to run TypeScript in development. The local database runs in **Docker** (a pinned PostgreSQL 18 image, port set by `DB_PORT`, bound to 127.0.0.1 only). Frontend: Next.js (App Router), TypeScript in strict mode, CSS Modules with the design tokens as CSS variables (no Tailwind), Zod (to check data coming from the API and from forms before it is used), Vitest, ESLint and Prettier. Next.js anonymous telemetry is turned off (`NEXT_TELEMETRY_DISABLED=1`), to match the privacy promise. The Cloudflare Turnstile bot check is called with the built-in `fetch`, so it needs no package. **Auth libraries (added 16 Nov, exact versions in `package.json`):** `bcrypt` 6.0.0 (password hashing; native, runs on Node 26.13.0; `bcryptjs` is the backup and is not installed), `jose` 6.2.14 (signs and checks the session JWT, HS256 only), `@fastify/cookie` 11.1.5 (reads and sets the session cookie) and `mailchecker` 6.0.21 (the disposable-email domain list). **Error tracking (added 18 Nov):** `@sentry/node` 11.10.0 with its Fastify integration. The 10,000 most common passwords are kept as a data file in the repo (from SecLists, with a note on its source), not as a package. The email-domain (MX) check uses Node's built-in DNS and needs no package. A new library is added to this list here first, with the founder's approval.

**Repository layout:** `gradea-frontend` holds everything the user sees (pages, components, `content/` JSON files, design tokens, design PNGs and screen notes). `gradea-backend` holds everything behind the scenes (API routes, database and Prisma, `lib/ai/`, payments and webhooks, scheduled jobs, emails) and the master copies of the PRD, SRS and Build Plan. Each repo has its own `AGENTS.md`, `CLAUDE.md`, `.claude/rules/` and `.claude/skills/`, with only what that side needs. The backend's Zod schemas are the single source of the API data shapes. The backend writes them, together with the shared analytics event list, into one generated file, and the frontend keeps a copy of that file. Until Phase 1 the copy is made by hand, backend first, in the same sitting as the change. From Phase 1 a GitHub Action in the backend repo opens a pull request in the frontend repo whenever the file changes. If the PRD, SRS or Build Plan change, they change in the backend repo first, then the frontend copy is updated.

**High-level architecture:**

- **Client (`gradea-frontend`, Next.js):** marketing site, guest upload flow, authenticated dashboard, scan results views, AutoFix/Magic Write interaction, billing UI.
- **API layer (`gradea-backend`, a standalone Node and TypeScript API server):** handles auth, upload, scan orchestration, usage enforcement, billing webhooks, and CV generation.
- **`lib/ai/` abstraction layer:** the only code path permitted to call AI providers. Exposes task-based functions (e.g., `extractContent()`, `scoreOverview()`, `scoreLineDetail()`, `autoFixLine()`, `magicWrite()`) that internally route to DeepSeek or GPT, without leaking provider-specific types or formats to callers.
- **Database (PostgreSQL via Prisma):** stores users, subscriptions, scan sessions, usage counters, and score history, per the retention rules locked in the PRD.
- **File storage:** transient only. Uploaded files are processed in memory or short-lived temporary storage during extraction, then discarded. See Section 8.
- **Payment provider integration:** Flutterwave (selected, PRD Section 22), integrated via webhook-driven subscription state updates.
- **Geolocation service:** a dedicated IP geolocation lookup, run early (on landing, not deferred to checkout), determines NGN vs. USD pricing. See Section 11.

**Architecture flow:** Client → API Layer → {Database, `lib/ai/` → DeepSeek/GPT, Payment Provider, Geolocation Service}. A full visual architecture diagram should be produced during detailed design work.

## 3. Data Model / Database Schema

**User**
- `id`, `email`, `password_hash` (nullable if Google-only), `google_id` (nullable), `career_level` (enum: entry, mid, senior, executive; required, chosen at signup, no database default), `created_at`
- `token_version` (integer, default 0, never negative; goes into every session token and is checked on every request; logout and any password change raise it, which ends all that user's old sessions), `consent_given_at` (timestamp, nullable; set by the server to the current time at signup when the person ticked consent, never taken from the client, never returned by any endpoint; null for accounts created before this was added)
- `subscription_status` (enum: free, pro, grace), `grace_until` (nullable timestamp, set to 24 hours after PRO access ends; in grace, view and download are allowed but AI actions and Re-score are blocked), `subscription_plan` (enum: day_pass, weekly, monthly, three_month, nullable if free), `subscription_expires_at` (nullable), `auto_renew` (boolean)
- `region` (enum: nigeria, international; database default nigeria), for pricing currency. If the location lookup fails the user falls back to nigeria (naira prices) and can switch with the manual override.
- `autofix_trial_used` (boolean, default false; set true only when a validated draft is shown, never on AI failure or validation rejection)
- `autofix_trial_regen_used` (boolean, default false; the one free "Try another version")
- `launch_promo_redeemed` (boolean, default false)

**ScanSession**
- `id`, `user_id` (nullable, for guest sessions before signup completes), `scan_type` (enum: general, smart_target), `career_level_used` (enum, may differ from the user's stored default per the per-scan override rule)
- `uploaded_file_format` (enum: pdf, docx), `extracted_content` (structured JSON from DeepSeek, the original file itself is not retained, see Section 8)
- `job_description_text` (nullable, smart_target only, kept with the session, deleted when the session or account is deleted or at the 12-month cap, never logged, never used for training)
- `created_at`

**ScanResult**
- A session can have several results (Re-score runs on the same session, and the "+X points" change and Historical Review need the earlier ones); read newest first. `id`, `scan_session_id`, `overall_score` (int, general only), `category_scores` (JSON: impact, brevity, leadership, ats), `relevancy_score` (int, smart_target only), `keyword_gap` (JSON, smart_target only)
- `line_level_feedback` (JSON array, nullable, populated on-demand only, automatically for PRO scans, for a Free user's one open category (the lowest-scoring, scoped call), or for the single line a Free user unlocks via their AutoFix trial, not computed by default for cost control). Each flagged-line entry includes its positional reference (section, sequence) so the frontend can highlight it directly on a rendered view of the original CV, alongside the quoted text and explanation, rather than displaying only an abstracted card.

**ImprovementAction** (AutoFix / Magic Write)
- `id`, `scan_session_id`, `line_reference`, `action_type` (enum: autofix, magic_write), `original_text`, `ai_drafted_text`, `user_supplied_facts` (JSON, nullable), `status` (enum: pending, approved, rejected), `validated` (boolean, result of the validation step)

**UsageCounter**
- `id`, `user_id`, `month` (year-month), `general_scans_used`, `smart_target_scans_used`

**Subscription / Transaction** (two tables: Subscription holds one row per paid plan with the plan, payment method, `card_authorization_ref` and `renewal_failed_count`; Transaction holds one row per charge with `provider_transaction_id`, plan, amount, currency, status, payment method and `proration_credit`; the access fields stay on User)
- `id`, `user_id`, `provider` (flutterwave), `provider_transaction_id`, `plan`, `amount`, `currency`, `status`, `created_at`, `payment_method` (card/transfer/ussd), `card_authorization_ref` (nullable provider token for renewals; never raw card data), `proration_credit` (nullable amount), `renewal_failed_count`

**PasswordResetToken** (table `password_reset_tokens`)
- `id`, `user_id`, `token_hash` (SHA-256 of the reset token in hex, unique; the token itself is never stored), `expires_at` (1 hour after creation), `used_at` (nullable), `created_at`. A new reset request deletes all of that user's older tokens. There is no cleanup job yet for expired rows.

**Data conventions** (implemented in the first migration)
- Table names are plural snake_case (`users`, `scan_sessions`, `scan_results`, `improvement_actions`, `usage_counters`, `subscriptions`, `transactions`) and columns are snake_case; the code keeps PascalCase and camelCase model names through Prisma mapping. `user` is a reserved word in Postgres, so it is never a table name.
- Money is stored as whole numbers in kobo or cents, never as floats. Currency is NGN or USD. Transaction status is successful, failed or reversed.
- `usage_counters.month` is text in the form YYYY-MM. Emails are stored lowercase and are unique.
- Database checks (raw SQL in the migration, because Prisma does not manage them): a user has at least one sign-in method (password or Google), the usage month has the YYYY-MM form, and counters are never negative.
- Guest sessions: a guest session is a scan session with no user, and its 30-minute expiry counts from `created_at` (setting `GUEST_SESSION_TTL_SECONDS`, fixed at 1800 in `src/config/limits.ts`). It has a `guest_token_hash` column (nullable, unique): SHA-256 of the token in lowercase hex, never the token itself. The token is 32 random bytes in URL-safe base64, shown once to the caller and never saved or logged. A claim clears the hash, so a token works once.
- Database tests run with `npm run test:db` against a local database only. CI does not run them yet; adding a Postgres service to the CI workflow is a later task.

**User (additions)**
- `role` (enum: user, admin; default user). Admin routes check this on the server, never only in the browser.

**Affiliate**
- `id`, `user_id`, `status` (enum: pending, approved, rejected, suspended), `code` (unique), `display_name` (nullable), `show_on_board` (boolean, default false), `payout_details_encrypted` (nullable; collected only at payout request, encrypted at rest, readable only by the admin payout screens), `created_at`

**ReferralVisit** (counts only, no personal data)
- `id`, `affiliate_id`, `date`, `visits` (integer count per day)

**Referral**
- `id`, `affiliate_id`, `referred_user_id` (unique, one affiliate per user), `attributed_at`. Created at signup when a valid referral code is present and within 30 days of the click. Self-referrals and users who already had an account are rejected.

**Commission**
- `id`, `affiliate_id`, `referral_id`, `transaction_id`, `amount`, `currency`, `status` (enum: pending, payable, paid, cancelled), `payable_at` (payment date plus 30 days), `created_at`. Created only for the referred user's first successful payment; amount is 20 percent of the amount actually received (after any launch discount). Cancelled if that transaction is reversed or fixed as a billing error.

**Payout**
- `id`, `affiliate_id`, `amount`, `currency`, `status` (enum: requested, paid, rejected), `requested_at`, `paid_at` (nullable), `paid_by_admin_id` (nullable). Minimum balance 1,000 NGN. Payouts are in NGN only; the programme is open to Nigerian affiliates only for now.

**FeatureVote** (G13 Coming soon features)
- `id`, `feature` (enum: job_board, cv_builder, scanned_cv, mobile_app), `created_at`. One row per tap. No email, no IP address and no other personal data is stored. The counts are read by the admin Metrics screen. A visitor can vote once per feature, checked in the browser, so the counts are a signal and not an exact figure.

**AdminAuditLog**
- `id`, `admin_user_id`, `action`, `target_type`, `target_id`, `reason` (nullable), `created_at`. Every admin action writes one row.

## 4. API Requirements

**Auth**
- `POST /api/auth/signup` — email/password signup, accepts email, password, career_level, consent (must be true) and the bot-check token. Answers 201 with `{ user }` and sets the session cookie (signup also logs the person in). Inputs are trimmed (except the password, which is never changed) and the email is lowercased; unknown fields are refused. Limit: 10 signups per hour per IP. Rejects emails whose domain is on the disposable-email blocklist (maintained open-source list, updated with dependency updates, plus a small in-house extras list) with a clear "Please use a real email address" error. No allowlist: all other domains are accepted. Signup also checks that the email domain has a valid mail (MX) record, or an address record when there is no MX (the check lets the person through if the DNS lookup times out after 3 seconds or fails), and requires an invisible bot-check token (e.g., Cloudflare Turnstile) validated server-side. These checks are shared by both signup paths: the signup wall (guest scan then `claim`) and the direct signup/login page. The unauthenticated guest upload endpoints (`POST /api/scan/general` and `/smart-target` without an account) require the same bot-check token and are rate limited per IP. Email verification is not required at launch; a feature flag `EMAIL_VERIFICATION_REQUIRED` (default off) is reserved so a 6-digit-code verification (gating the free AutoFix trial first) can be enabled later without a rewrite.
- Google sign-in (authorization code flow with PKCE, handled by the backend; built with `jose` and the built-in `fetch`, no package). `GET /api/auth/google` starts it: it sets the flow cookie and redirects to Google (`prompt=select_account`, scopes openid, email, profile). `GET /api/auth/google/callback` checks the state, exchanges the code and verifies the ID token (RS256 only, issuer, audience `GOOGLE_CLIENT_ID`, expiry, nonce, `email_verified` must be true), then redirects to the site: (a) the Google id already belongs to a user: logged in, to `/`; (b) no user has the email: to `/signup/google`, where the person gives career level and consent; (c) the email belongs to a password account with no Google id: to `/link-google` (screen A6) to confirm with the existing password; (d) the email belongs to an account with a different Google id, any other failure, or an unexpected error: to `/login?error=google_failed` without saying why; the person cancelling goes to `/login?error=google_cancelled`. `GET /api/auth/google/pending` returns `{ flow: "signup" | "link", email }` for those two screens (the frontend cannot read an httpOnly cookie). `POST /api/auth/google/complete` `{ career_level, consent }` creates the account (no password, Google id set, `consent_given_at` set by the server), logs the person in and answers 201 `{ user }`; if the email got an account in the meantime it answers 409 `email_taken`. `POST /api/auth/google/link` `{ password }` checks the password like login, then saves the Google id and logs the person in (200 `{ ok: true }`); a wrong password answers 401 `wrong_password` ("That password is wrong.") and counts toward the failed-login limits, plus 10 attempts per 15 minutes per IP on this route. `POST /api/auth/google/cancel` forgets the pending Google account. The "Continue with Google" button is a full-page link to the API's `/api/auth/google`. Google accounts skip the bot check and the disposable and mail-domain checks (Google verified the address). The complete route has the same limit as signup (10 per hour per IP); start and callback are limited to 20 per minute per IP. Every POST has the Origin check. If the Google settings are missing locally, these routes answer 503 `google_not_configured`.
- `POST /api/auth/login` — email/password login. Answers 200 with `{ user }` (the same public user as signup) and sets the session cookie. A wrong password and an unknown email give the same message ("Email or password is wrong."), the same status and the same timing (an unknown email still runs a password compare against a fixed dummy hash). Failed logins are limited to 30 per 15 minutes per IP and 10 per 15 minutes per email, counting failures only. Over a limit: 429 `rate_limited`, no lockout wording.
- `POST /api/auth/logout` — raises the user's `token_version` (ends every session of that user) and clears the cookie.
- `GET /api/auth/me` — returns the signed-in user: id, email, role, created_at, subscription fields (plan, status, expires_at, grace_until) and career_level. Never returns the password hash, Google id, token_version or consent time. Answers 401 `not_signed_in` when there is no valid session.
- `POST /api/auth/password-reset` — request and complete password reset via email (Resend), one path where the body decides the step. Body `{ email, bot_token }` asks for a link: it always answers 200 `{ ok: true }` whether or not the email has an account, and the lookup, the token and the send all run after the answer, so timing never differs. Accounts with no password (Google only) get the same link. Limits: 5 requests per hour per IP and 3 per hour per email (also counted for emails with no account); over a limit gives 429 `rate_limited`. The bot check applies to this step only. The token is 32 random bytes in URL-safe base64, valid for 1 hour, used once. Body `{ token, password }` sets the new password: the password follows the same rules and messages as signup and is checked before the token; a wrong, expired, used, empty or badly shaped token gives 400 `reset_token_invalid`, "This link has expired or is not valid. Request a new one."; a missing field gives 400 `validation_failed`. Success saves the new hash, marks the token used, deletes the user's other tokens, raises `token_version` (every old session ends) and answers 200 `{ ok: true }` without logging the person in. Limit: 10 attempts per 15 minutes per IP. The email is sent with Resend through the built-in `fetch` (no package), from `EMAIL_FROM`, and its link is `APP_URL/reset-password?token=...`, so the frontend serves `/reset-password`. A failed send is logged without the token or address and never changes the answer.

**Feature votes (public)**
- `POST /api/feature-vote` — public, one tap on G13. Body: `feature` (job_board, cv_builder, scanned_cv or mobile_app) and `bot_token`. Same invisible bot check (Cloudflare Turnstile, controlled by `BOT_CHECK_ENABLED`, off in local development and on in production) and per-IP rate limit as guest upload: 5 requests per minute per IP on this route; over the limit the API answers 429 with code `rate_limited`. The rate-limit counter lives in the server's memory, so with more than one server each counts on its own; a shared store is needed before scaling out. Success is `200` with `{ "ok": true }`. Error codes: `validation_failed` (400), `bot_check_failed` (400), `rate_limited` (429), `internal_error` (500). Saves one FeatureVote row and returns no counts.

**Scan submission (guest-accessible)**
- `POST /api/scan/general` — accepts CV file, optional guest session token, career_level override; returns scan_session_id
- `POST /api/scan/smart-target` — also accepts an existing in-session scan reference in place of a CV file (for the results-view General / Job-specific switch, no re-upload); accepts CV file, job description as either pasted text or a URL (validated against the recognized ATS allowlist, with graceful fallback to a "please paste the text" prompt on failure), optional guest session token, career_level override; returns scan_session_id
- `POST /api/scan/:id/claim` — called right after signup to attach a guest's pending scan session to the newly created account. Needs the signed-in session cookie and the guest token in the `X-Guest-Token` request header. Sets the session's `user_id`, clears `guest_token_hash` and answers 200 `{ ok: true }`. It does not start scoring yet: scoring is wired in Phase 2. Every failure (wrong, missing or already used token, expired session, unknown id) gives the same answer: 404 `guest_session_invalid`, "This scan has expired or can't be found. Please upload your CV again.", so the frontend shows the re-upload message. Other answers: 401 `not_signed_in`, 403 `origin_not_allowed`, 429 `rate_limited`. Limit: 10 attempts per minute per IP (`CLAIM_RATE_LIMIT`). Token hashes are compared in constant time, and two claims at once cannot both win. A cleanup function deletes unclaimed guest sessions that are 30 minutes old or more, with their results and extracted content; the scheduled job that calls it comes later.

**Results**
- `GET /api/scan/:id/result` — returns overview score data and issue counts for every category; gated by tier for line-level detail (Free receives detail for the lowest-scoring category only)
- `POST /api/scan/:id/unlock-line` — Free tier only, spends the lifetime AutoFix trial on a chosen line, returns that line's detail plus AutoFix draft
- `POST /api/scan/:id/autofix/:lineId` — PRO only (or the one unlocked Free line), requests an AutoFix draft for a specific line
- `POST /api/scan/:id/autofix/:lineId/regenerate` — one free alternative draft for the same line (Free trial), unlimited for PRO within fair use
- `POST /api/scan/:id/changes/:changeId/undo` — PRO only, reverts an approved AutoFix change or removes a Magic Write bullet from the working copy
- `POST /api/scan/:id/rescore-working-copy` — PRO only, runs scoring on the session's working copy without re-upload, counts as a scan
- `POST /api/scan/:id/magic-write/place` — adds an approved Magic Write bullet to a chosen job or project entry in the working copy
- `POST /api/scan/:id/autofix/:lineId/respond` — user approves/rejects, or supplies a requested missing fact
- `POST /api/scan/:id/magic-write` — PRO only, accepts user-supplied facts, returns drafted bullet

**Generation & Download**
- `POST /api/scan/:id/generate` — produces the final downloadable file (same format as upload) reflecting approved changes
- `GET /api/scan/:id/download`

**Dashboard**
- `GET /api/dashboard` — subscription status, usage counters, career level, trial status
- `GET /api/history` — Free: score log; PRO: full Historical Review list
- `GET /api/history/:id` — PRO only, full session detail

**Billing**
- `POST /api/billing/checkout` — initiates payment for a selected plan (day_pass/weekly/monthly/three_month), applies launch promo if eligible
- `POST /api/billing/webhook` — receives payment provider confirmation, updates subscription_status and expires_at, signature-verified
- `GET /api/billing/plans` — returns plans with currency based on detected region
- `POST /api/billing/cancel-renewal` — cancels auto-renewal for Monthly/3-Month plans without revoking current access (access continues to `subscription_expires_at`)
- `POST /api/billing/resume-renewal` — turns renewal back on before the paid period ends
- `POST /api/billing/update-card` — replaces the saved card authorization used for renewals (provider-hosted; no card data touches Gradea)
- `GET /api/billing/quote?plan=` — returns the exact amount for a plan change, including the proration credit line, before checkout
- `GET /api/billing/payment-status/:reference` — polled by the "Confirming your payment" screen; returns pending, success or failed

**Contact**
- `POST /api/contact` — public contact form (name, email, message); requires the invisible bot-check token and is rate limited per IP; sends the message to the support inbox via Resend

**Affiliate**
- `GET /r/:code` — public referral link. Records one count in ReferralVisit, stores the code in a first-party cookie for 30 days only for visitors arriving through a referral link (PRD Section 22, item 10), then redirects to the homepage. Never sets anything for other visitors.
- `POST /api/affiliate/apply` — a signed-in user applies; creates a pending Affiliate
- `GET /api/affiliate/me` — the affiliate's own status, code and link
- `GET /api/affiliate/stats` — own visits, signups, paid conversions and earnings (pending, payable, paid), plus the monthly top-affiliates board (only opted-in display names, ranked by paid conversions)
- `POST /api/affiliate/payout-request` — requests a payout when the payable balance meets the minimum; collects payout details (encrypted)
- Attribution is applied inside signup (reads the referral cookie) and commissions are created inside the billing webhook handler, never from the browser. The commission amount is always computed on the server.

**Admin** (all routes require `role = admin`, are not indexed, and write an AdminAuditLog row for every change)
- `GET /api/admin/users?search=` and `GET /api/admin/users/:id` — plan, status, usage and recent activity. No CV content.
- `POST /api/admin/users/:id/grant-pro` — grants or extends PRO by hand for a billing error; requires a reason
- `GET /api/admin/launch-offer` — redemptions out of 20
- `GET /api/admin/billing-errors`, `POST /api/admin/billing-errors/:id/resolve`
- `GET /api/admin/inbox` — feedback and contact submissions
- `GET /api/admin/affiliates`, `POST /api/admin/affiliates/:id/approve`, `POST /api/admin/affiliates/:id/reject`
- `GET /api/admin/payouts`, `POST /api/admin/payouts/:id/mark-paid`
- `GET /api/admin/abuse` and `GET /api/admin/audit-log`
- `GET /api/admin/metrics?period=&country=&city=` — the usage numbers for the Metrics screen (PRD Section 26). The backend asks PostHog for them with a read-only key and keeps each answer for a few minutes, so the screen stays fast and the key is never sent to the browser. `period` is today, 7d, 30d or all. `country` and `city` are optional. Any region with fewer than 5 searches is returned as "Other". The response holds counts, search words and percentages only, never CV or job description text, emails or IP addresses. It can only return events that exist in the shared event list. When PostHog has no data or cannot be reached, the response says so and the screen shows "No data yet" or a plain "Could not load the numbers" message, never made-up values.

**Public files**
- `GET /robots.txt`, `GET /sitemap.xml`, `GET /llms.txt` — generated at build or on request (PRD Section 27). The admin area is excluded from the sitemap and carries noindex.

**Profile and account**
- `PATCH /api/profile/career-level` — updates stored default career level
- `POST /api/auth/change-password` — email/password users only; requires the current password
- `DELETE /api/account` — self-serve account deletion. Requires typed confirmation, plus the password (email users) or a fresh Google re-authentication. In one transaction: cancels any auto-renewal with the payment provider, ends any active plan, hard-deletes the user's scans, extracted content, score history and Historical Review sessions, and removes the account and email from the mailing list. Payment transaction records are retained with provider references but contain no CV content. Sends a final confirmation email (Resend) and signs the user out.
- `GET /api/billing/history` — the signed-in user's own transaction records (date, plan, amount, currency, status) for the billing page

## 5. Authentication & Authorization Specification

**Methods supported:** email/password, and Google OAuth 2.0. A user may have both linked to the same account. Account linking requires explicit confirmation: if a Google login matches an existing email/password account, the user must confirm by entering their existing password once before the accounts are linked. Silent auto-linking by matching email address alone is never permitted, to prevent account takeover. The Google flow uses two short-lived cookies, `gradea_google_flow` (state, nonce and PKCE verifier) and `gradea_google_pending` (the Google id and email waiting for the next screen). Both are httpOnly, `SameSite=Lax`, `Secure` in production, set for `COOKIE_DOMAIN` when it is set, limited to the path `/api/auth/google`, and last 10 minutes. They are JWTs signed with the session secret (HS256 pinned, audience `gradea-google`, and a purpose claim: `google_flow`, `google_signup` or `google_link`), so neither can stand in for a session (audience `gradea-web`) and one purpose never passes as another. Only the Google id (`sub`) is kept from Google; the profile name is not stored. If the Google email later changes, the Gradea email stays as it is.

**Password requirements:** minimum 8 characters and maximum 72 bytes (bcrypt ignores everything after 72 bytes). No symbol, capital or number rules. Very common passwords (the top 10,000 list, compared ignoring letter case, so `Password1` is caught like `password1`) are refused with "That password is too common." The password is never trimmed or changed.

**Password storage:** hashed with bcrypt at cost 10 (the `BCRYPT_COST` setting; measured on the dev machine at about 93 ms per hash at cost 10 and about 270 ms at cost 12). bcrypt makes its own random salt for each password, so no custom salt is added. Only the hash is stored; it never appears in any response, log or error. Never stored in plain text or reversible encryption.

**Session management:** JWT-based sessions. The backend handles sign-up, login and Google OAuth and issues the JWT. The token lives only in an httpOnly cookie (never in a response body): HS256 only, signed with `JWT_SECRET` (at least 32 random characters; the server refuses to start in production without a strong one), fixed 24-hour expiry (`SESSION_TTL_SECONDS`, no sliding renewal), `Secure` in production, `SameSite=Lax`, and `COOKIE_DOMAIN` set for the shared parent domain (unset locally). Every token carries the user's `token_version`, checked on every request. Every request that changes data is checked against the `Origin` header: if one is present and is not the allowed site, the API answers 403 and does nothing. CORS sends credentials for the one allowed origin only. The backend never logs passwords, hashes, tokens or the body of auth requests. The frontend sends the cookie with each API call. The mobile app later uses the same API. A library such as Auth.js may be used on the backend side if it fits; the rule is that auth lives in `gradea-backend`.

**Guest sessions:** a guest who uploads a CV before signup is issued a temporary, unauthenticated session token tied to their in-progress scan, used to reattach that scan to their account immediately after signup (via the `claim` endpoint). Guest session tokens expire after **30 minutes** if signup is not completed, at which point the associated scan data (including any transiently stored file and extracted content) is discarded entirely.

**Authorization:** every authenticated endpoint must verify the requesting user owns the resource being accessed, enforced at the API layer, not assumed from the frontend.

**Google OAuth token handling:** access and refresh tokens from Google are not retained beyond the login flow unless a specific future feature requires it; if retained, they must be encrypted at rest.

## 6. AI System Requirements

**The `lib/ai/` abstraction contract.** All AI calls go through this module. It exposes task-based functions, not provider-specific ones:

- `extractContent(file): StructuredCV` — DeepSeek, extraction/structuring for both CVs and job descriptions. Timeout: 8 seconds. **For CVs specifically, output includes approximate positional metadata for each line/bullet (which section, sequential position within the document) alongside the structured text**, so that flagged lines can be highlighted directly on a rendered view of the user's actual CV in the results interface, rather than shown only as abstracted quoted text. This is a scope addition beyond plain text extraction, and depends on the file rendering approach chosen for the results view (Section 4/results endpoints).
- `fetchJobDescriptionFromURL(url): RawText | FetchFailure` — not an AI call itself, a server-side fetch attempt scoped to a recognized allowlist of publicly-readable ATS platforms (e.g., Greenhouse, Lever, BambooHR; Workday, Jobberman and MyJobMag are added only after testing shows they read reliably). Returns raw page text for extraction if the domain is recognized and the fetch succeeds, or a typed failure if the domain isn't recognized, the fetch fails, or the returned content doesn't resemble a real job posting (e.g., a login wall). On failure, the user is prompted to paste the description text instead. This function does not attempt to fetch login-gated or scraping-hostile platforms (e.g., LinkedIn); that capability is a post-MVP browser extension/bookmarklet, not a server-side fetch (PRD Section 21).
- `scoreOverview(structuredCV, careerLevel): OverviewScore` — GPT, produces overall score + 4 category scores (General), or Relevancy Score + keyword summary (Smart Target). Timeout: 10 seconds.
- `scoreLineDetail(structuredCV, careerLevel): LineDetail[]` — GPT, produces full line-by-line flagged detail. Called automatically for PRO scans, and on-demand for a Free user's single trial line. Timeout: 12 seconds.
- `autoFixLine(line, cvContext): AutoFixDraft` — GPT, drafts a rewrite for one flagged line, may return a `missingFactsRequest` instead of a draft. Timeout: 8 seconds.
- `magicWrite(userFacts): DraftBullet` — GPT, converts user-supplied facts into a polished bullet. Timeout: 8 seconds.
- `validateOutput(draftText, sourceContent): ValidationResult` — verifies a draft's claims trace back to source content or user-supplied facts. Timeout: 5 seconds.

Each function's internal provider routing (which provider, which model tier) is configuration, not hardcoded in calling code, so it can change without touching business logic elsewhere.

**Timeout values above are starting configuration**, based on the 15-second full-analysis and 5-second generation budgets in PRD Section 19, not measured real-world latency. They must be revisited once real latency data exists from actual DeepSeek/GPT calls under production-like conditions.

**Failure handling.** Every `lib/ai/` function implements: one automatic retry (same timeout budget as the original attempt) on failure or malformed response, a typed error thrown on second failure, never a silent fallback. A failed call never decrements a usage counter, increments only occur after a successful, validated response.

**Schema validation.** Every AI response is validated against an expected schema (e.g., using Zod) before use. A response failing schema validation is treated as a failure, triggering the retry-then-error path, never passed through partially.

**Skeleton as built (17 Nov, `src/lib/ai/`).** The seven functions exist and return realistic placeholder data that passes its own schema; real DeepSeek and GPT calls come in Phase 2. Every data shape is a Zod schema with the types derived from it. Decisions made while building: (1) `extractContent` takes `{ kind: "cv", file }` or `{ kind: "job_description", text }`; a job description comes back as its own `StructuredJobDescription` shape. (2) `scoreOverview(structuredCV, careerLevel, jobDescription?)` has an optional third argument: without it the result is General, with it Smart Target. (3) `StructuredCV` has `isEnglish` (the English check happens during extraction, Section 8) and an `entries` list (jobs and projects) for the Magic Write dropdown; line positions are the section, the document index and the index within the section, with no page or coordinates until the results-view rendering choice is made. (4) `AutoFixDraft` has a `lineId` plus exactly one of `draftText` or `missingFactsRequest` (at most 3 questions). `UserFacts` is `what` (required), `when`, `scale` and `outcome`. (5) `autoFixLine` and `magicWrite` call `validateOutput` themselves before returning; a rejected draft throws `AiError` with reason `validation_rejected`, and regeneration is decided in Phase 2. AutoFix validates against every CV line plus the supplied facts; Magic Write validates against the facts the person typed. The placeholder validator fails closed (every word of the draft must appear in the sources); the real check replaces it in Phase 2. (6) `AiError` has a task and a reason: `timeout`, `provider_error`, `malformed_response` or `validation_rejected`. (7) `fetchJobDescriptionFromURL` is not an AI call: it never retries or throws, and returns a typed failure (`not_implemented`, `domain_not_allowed` or `invalid_url`). The allowlist is greenhouse.io, lever.co and bamboohr.com and their subdomains, https only, no user:password in the address; look-alike domains are refused. It makes no request yet and has no timeout; one is added with the real fetch. (8) Timeouts and `AI_MAX_ATTEMPTS = 2` live together in `src/config/limits.ts`. Provider and model tier per task are configuration (`extractContent` DeepSeek, the rest GPT, tiers are placeholders until Phase 2). (9) Every failed attempt is logged as "ai call failed" with only the task, provider, duration and error type, and validation rejections are logged apart; CV text, job text and the provider's error object are never logged. (10) Nothing in `src/lib/ai/` may import the database, and provider packages cannot be imported outside it (a lint rule and a test). (11) `lib/ai` returns the missing keywords; hiding them from Free users is the caller's job (PRD Section 12.2). Open for Phase 2: which function produces Smart Target's "lines to tailor", which this section does not say.

**Data handling for training exclusion.** API calls to DeepSeek and GPT use account/API-tier settings that guarantee no training on submitted data, configured at the provider account level.

## 7. Usage Limit & Entitlement Enforcement Logic

**Free tier limits:** 5 General scans and 1 Smart Target scan per calendar month, tracked via `UsageCounter`, keyed by user_id and month. Checked before any AI call is invoked; if the limit is reached, the request is rejected before any AI cost is incurred.

**Counter reset:** calendar month, same reset date (the 1st) for all users. Chosen for simplicity over a per-user rolling 30-day window, given the fairness gap is minor for a free tier.

**PRO tier:** no monthly counter. Scans proceed subject to `subscription_status` being active and unexpired, and to a quiet fair-use limit (PRD FR-29): 20 scans per day and 40 AutoFix or Magic Write actions per day per account, counted over a rolling 24 hours, the same for all PRO plans. Keep the two numbers in config, not in code. At 80 percent of either, log a quiet alert for the founder (no message to the user). At 100 percent, block new scans, AutoFix, Magic Write, Undo and Re-score with a friendly pause response that includes `pause_until` (view and download stay allowed); the UI shows the D2 pause banner with that time and no numbers. Count each AI call per user so cost per user can be measured. Review the values after 30 days.

**Day Pass expiry:** `subscription_expires_at` checked on every scan request for Day Pass users; once expired, the user is automatically treated as Free tier without a separate downgrade action.

**Auto-renewal:** only Monthly and 3-Month plans auto-renew, and only when paid by card (a saved provider authorization exists). Cancellable anytime via `POST /api/billing/cancel-renewal`, which sets `auto_renew` to false without revoking current access; `POST /api/billing/resume-renewal` reverses it before expiry. The Day Pass and Weekly plans are one-off purchases and never auto-renew. Bank transfer and USSD purchases never auto-renew.

**AutoFix trial:** enforced via `autofix_trial_used` on the User entity, checked before the `unlock-line` endpoint proceeds. Once true, permanently blocks further free trial use for that account.

**Launch promo:** enforced via a global counter tracking total redemptions across all users, checked at checkout time, capped at 20 redemptions.

**Refunds:** purchases are non-refundable (PRD Section 16, FR-38). There is no refund flow and no refund-triggered access revocation to build.

## 8. File Handling & Storage Specification

**Upload validation:** enforced before processing begins: file format (PDF or DOCX only), file size (max 2MB), language check (English only, performed during extraction). A failing file is rejected immediately with a clear error.

**Original file storage:** the original uploaded file is **not retained** after extraction completes. It exists only transiently (in memory or short-lived temporary storage) during extraction, then is discarded.

**What IS retained:** the extracted, structured content (not the original file) is stored in `ScanSession`, subject to the 12-month retention and deletion rules (PRD Section 18). Deleted entirely for Free users beyond the score-and-date log.

**Job description text:** stored with its Smart Target session so AutoFix, Magic Write and Historical Review can use it. Deleted with the session (user deletion, account deletion, or the 12-month cap). Never written to logs or Sentry, never used for model training, never shown to other users.

**Guest session files:** if a guest session expires (30 minutes) without completing signup, all associated data, including any transiently stored file and extracted content, is discarded entirely.

## 9. Payment & Subscription Integration Specification

**Provider:** Flutterwave. The founder has confirmed that the provider supports charging a saved card in NGN and USD, repeat charges on USD cards, and custom amounts per charge, so renewals and proration are built as "charge the saved card ourselves" rather than provider-managed fixed plans, keeping the provider swappable. One gateway handles both NGN and USD charges; Stripe is not used. A registered business is required, which the founder will set up. USD payout may need a domiciliary account.

**Checkout flow:** user selects a plan via `POST /api/billing/checkout`. Currency (NGN or USD) is determined by the user's detected region (Section 11's geolocation service). Launch promo discount applied if the user is eligible and the 20-redemption cap hasn't been reached. User is redirected to the provider's hosted checkout.

**Webhook handling:** `POST /api/billing/webhook` receives payment confirmation. On success, updates `subscription_status` to `pro`, sets `subscription_plan` and `subscription_expires_at` (24 hours for Day Pass; 7/30/90 days for Weekly/Monthly/3-Month). Webhook signature verification is required to prevent spoofed confirmations.

**Expiry handling:** a scheduled job or lazy check-on-request transitions a user to `grace` when `subscription_expires_at` passes, then to `free` when `grace_until` passes, without requiring user action. Saved PRO sessions are kept for 12 months and are locked while the user is `free`, restored on repurchase.

**Renewal:** Monthly and 3-Month auto-renew only when paid by card (Section 7). They can also be paid by bank transfer or USSD, as a one-off that does not renew. Day Pass and Weekly never auto-renew. A scheduled job sends reminder emails (Resend) 3 days before each automatic charge, and 1 day before a Weekly plan ends.

**Failed renewal charges:** retried twice over 3 days, with an email each time and an in-app "Fix payment method" prompt (`update-card`). If still failing, the plan is allowed to expire and the user moves to `grace`, then `free`, per the expiry rule above. A failed renewal never changes access earlier than `subscription_expires_at`.

**Plan changes and proration:** `GET /api/billing/quote` computes the amount. Upgrade to a longer plan: credit = (days remaining / days in cycle) x price actually paid for the current cycle (the discounted price if a launch offer was used); the user pays the new plan price minus this credit as a normal one-off charge and the new cycle starts immediately. The credit is a discount only, never a refund. Downgrade: scheduled for the next renewal. Same or shorter plan on a non-renewing purchase: the new duration is added after the current `subscription_expires_at` (stacking). Day Pass purchase is rejected while a longer plan is active. The launch offer is not applicable to plan changes by existing subscribers.

**Payment confirmation:** the client polls `payment-status`. Webhook processing is idempotent (keyed by provider transaction reference) so a repeated webhook or a double tap cannot grant time twice. If the webhook arrives after about 60 seconds, access still switches on when it arrives and a confirmation email is sent. Checkout creation is rate-limited per user to prevent duplicate payments.

**Launch offer cap:** redemptions are counted atomically on successful payment. Once 20 is reached, `GET /api/billing/plans` stops returning the offer fields and the UI shows standard prices.

**Failed payments:** a failed or abandoned checkout does not change the user's subscription status.

**Refunds:** all purchases are non-refundable (PRD Section 16, FR-38). There is no refund flow. Proration credit is a discount on a new purchase only, never a cash refund. The only exception is a billing error (a duplicate charge for the same purchase, or a charge where PRO access never switched on), which the founder corrects manually by reversing the duplicate charge or granting the access. Every transaction is logged with its provider reference so such cases can be found and verified.

## 10. Non-Functional Requirements, Formalized

- **Performance:** full analysis (extraction + overview scoring) completes within 15 seconds under normal conditions, per the timeout budget in Section 6. CV generation completes within 5 seconds.
- **Concurrency:** initial target of 50 to 100 concurrent active users at launch, informing database connection pool sizing and AI provider request queuing. Revisited once real launch traffic data exists.
- **AI provider rate limits:** the system respects DeepSeek's and GPT's API rate limits, queuing or gracefully rejecting requests that would exceed them rather than allowing silent failures under load.
- **Availability:** no formal uptime/SLA target for MVP. Architected for reasonable reliability (managed hosting with automatic restarts on crash) without requiring multi-region redundancy at this stage.
- **Security:** HTTPS enforced everywhere, password hashing per Section 5, webhook signature verification per Section 9, no plaintext storage of any payment data, API authorization checks on every protected endpoint.
- **Data minimization:** original uploaded files not retained (Section 8), job description text kept only with its session and deleted with it (Section 8), all 12-month retention caps enforced via a scheduled deletion job, not just documented policy.
- **Maintainability:** the `lib/ai/` abstraction is the single enforced boundary for AI provider code; code review should verify no AI provider SDK is imported outside this module.
- **Observability:** Sentry (or equivalent) for error tracking, plus structured logging specifically around AI pipeline calls (success/failure, timing, provider) and payment webhook events.

## 11. Third-Party Dependencies & Integrations

- **DeepSeek API** — extraction and structuring. Accessed only via `lib/ai/`.
- **GPT API** — scoring, Relevancy analysis, Keyword Gap analysis, AutoFix, Magic Write. Accessed only via `lib/ai/`. Account-level configuration disables training on submitted data.
- **Payment provider** — Flutterwave. Checkout, recurring billing, webhook-based confirmation.
- **Geolocation service** — a dedicated IP geolocation lookup (e.g., ipapi.co or equivalent), run early (on landing, not deferred to checkout), with a manual override available if detection is wrong (open item carried from PRD Section 16).
- **Google OAuth** — authentication, handled by the backend with `jose` and the built-in `fetch` (no Auth.js).
- **Error tracking** — Sentry (`@sentry/node` with its Fastify integration), on only when `SENTRY_DSN` is set. It receives unhandled errors and every 500 `internal_error`, never the expected 4xx answers. Nothing about the person or the request is sent (no bodies, cookies, headers, query strings, IP addresses, emails, passwords, tokens, CV or job description text, and no error messages); the only person data is the internal user id of a signed-in caller. Tracing samples 10 percent of requests.
- **Usage analytics** — PostHog (PRD Section 19): page views, clicks, funnels, searches, and country and city, on the site and the app. It records actions and never CV or job description text. No recordings on upload, scan and results screens, no full IP stored, signed-in users identified by internal id only. It sets no cookie and keeps nothing in the browser (memory only, Do Not Track respected). The cookies Gradea does set are the login session, the two 10-minute Google sign-in cookies (Section 5) and, only for visitors who arrive through a referral link, the referral code; the Privacy page names them in plain words. One shared list of event names is used by `gradea-frontend` and `gradea-backend`. Search events keep only the plain search words: a search longer than a set length, or one that looks like an email address or phone number, is dropped before it is sent. The admin Metrics screen reads these numbers back through the backend (Section 4, admin metrics), using a read-only PostHog key. Signed-in product metrics (plans, scans, conversion) also come from the database. The backend also sends four server-side account events with the built-in `fetch`: `account_signed_up` and `account_logged_in` (property `method`: email or google), `password_reset_completed` and `google_linked` (linking also sends `account_logged_in` with method google). They carry the internal user id only, never an email, name, IP, password or token, and a flag stops PostHog looking up a place from the server's IP. They are sent after the response and never delay or change it; a failed send is logged with the event name only. The events and their allowed properties are in the shared contract file.
- **Email service** — Resend (or equivalent), for password reset and a welcome email sent at signup completion (invites the person to follow the WhatsApp channel). The welcome email (H1) is sent after the response for both signup paths, never blocks or fails signup, and has the headline "Welcome to Gradea" with no name, because Gradea stores no name. The WhatsApp channel invite shows only once `community_whatsapp_url` is filled in `content/emails/welcome.json` (it replaces the earlier `community_x_url` and `community_reddit_url` keys). The "Scan my CV" button goes to the homepage, and the Free plan numbers in the box come from the Free-limit settings in `limits.ts`, not from the text. Payment receipts may rely on the payment provider's own automatic receipts rather than a duplicate system.
- **YouTube (privacy-enhanced embed)** — the how-to video loads only after the visitor taps play, so no cookies are set before that and no cookie banner is needed (FR-49).
- **Search tools** — Google Search Console and Bing Webmaster Tools, set up at launch.
- **Flutterwave transfers** — used by hand, from the admin dashboard, to pay affiliate payouts (no automatic payouts at launch).
- **File processing libraries** — PDF and DOCX parsing (e.g., `pdf-parse`, `mammoth`, or equivalent in the Node/TypeScript ecosystem). Left as an implementation detail for the engineering team.

## 12. Error Handling & Logging Strategy

**One error shape for the whole API.** Every error response, from any route, has the same body: `{ "code": "...", "message": "..." }`, where `code` is a short stable machine-readable word (for example `not_found`, `validation_failed`, `rate_limited`, `internal_error`) and `message` is plain text safe to show a user. This includes the cases Fastify handles by default: unknown routes (404), invalid input (400) and unexpected crashes (500) are all converted to this shape by one shared error handler. The 500 response never includes a stack trace, an internal message, or any request data. The shape is part of the shared API file, so the frontend reads the same `code` values. The full list of codes is `not_found`, `validation_failed`, `bot_check_failed`, `rate_limited` and `internal_error`, plus the auth codes: `email_disposable` (400, "Please use a real email address."), `email_domain_not_found` (400, "We can't find that email domain. Check for typos."), `email_taken` (409, "That email already has an account."), `password_too_short` (400, "Use at least 8 characters."), `password_too_long` (400, "Use at most 72 characters."), `password_too_common` (400, "That password is too common."), `career_level_required` (400, "Choose your career level."), `invalid_credentials` (401, "Email or password is wrong."), `not_signed_in` (401) and `origin_not_allowed` (403, the request came from a site that is not allowed) `wrong_password` (401, "That password is wrong.", used only when confirming a Google link), `google_pending_invalid` (401, "Your Google sign-in has expired. Please continue with Google again."), `google_not_configured` (503) and `guest_session_invalid` (404, "This scan has expired or can't be found. Please upload your CV again.") and `reset_token_invalid` (400, "This link has expired or is not valid. Request a new one."). Status codes: `validation_failed` is 400, or 413 when an auth body is over 10 KB, or 415 when the content type is not JSON; `bot_check_failed` is 400; `rate_limited` is 429; `internal_error` is 500. A new code is added here first. The `message` is plain text that is safe to show, but the frontend shows its own wording chosen by `code`. Until Sentry is set up, error logs keep the error code and stack frames but drop the message. One known limit: a malformed request that never reaches Fastify's routing gets Node's default reply, not this shape.

**AI pipeline errors** (extraction, scoring, AutoFix, Magic Write): handled per Section 6's retry-then-fail pattern. Every failure (initial and retry) is logged with which function failed, which provider, timing, and error type, feeding into Sentry/structured logging.

**Validation failures:** logged distinctly from ordinary AI errors, since this is a signal about AI reliability, not infrastructure failure. Structured so the PRD's validation rejection rate metric (Section 19, target under 5 percent) can actually be calculated from it.

**Payment/webhook errors:** any webhook failing signature verification, or referencing an unknown transaction ID, is logged and does not change any user's subscription status. Malformed or unverifiable webhooks fail safely (no state change), never fail open.

**User-facing errors:** clear and actionable messaging for any surfaced error (extraction failure, scan limit reached, payment failure, AI provider failure after retry). Never a raw technical error or stack trace.

**Guest session errors:** if a guest's session expires or data is discarded before signup completes, the user sees a clear message explaining they'll need to re-upload, never a silent failure or broken state.

## 13. Deployment & Environment Requirements

**Environments:** production and a staging/preview environment for testing changes before release. Preview deployments per pull request (e.g., via Vercel or similar) are worth adopting given this is a solo/small-team build.

**Environment variables / secrets management:** all API keys (DeepSeek, GPT, payment provider, geolocation service, email service, OAuth credentials, the Turnstile secret, and the read-only PostHog key and project id used by the admin Metrics screen) managed via environment variables and a secrets manager, never committed to source control.

**Backend settings (environment variables):** `NODE_ENV`, `PORT`, `DATABASE_URL`, `DIRECT_DATABASE_URL` (migrations only), `ALLOWED_ORIGIN`, `BOT_CHECK_ENABLED`, `TURNSTILE_SECRET_KEY` (required when the bot check is on) and `RESEND_API_KEY` (required in production; locally, without it the email is printed to the terminal with its link, never in production), `EMAIL_FROM` (default `Gradea <no-reply@usegradea.com>`, must start with "Gradea <"), `EMAIL_REPLY_TO` (optional, the support address, empty means no reply-to), `APP_URL` (the site origin used in email links, default `http://localhost:3000`, https in production), `POSTHOG_KEY` and `POSTHOG_HOST` (default `https://eu.i.posthog.com`; optional locally, where no key means no events are sent; required in production), `SENTRY_DSN` (optional, https; unset means Sentry stays off, as in local development and tests), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` (all required in production, the redirect must be https; locally the redirect defaults to `http://localhost:4000/api/auth/google/callback` and the Google routes answer 503 without the others), `JWT_SECRET` (required in production, at least 32 characters), `BCRYPT_COST` (default 10), `COOKIE_DOMAIN` (unset locally) and `TRUST_PROXY` (default off; turned on only when the host puts a proxy in front and the server cannot be reached except through it, because the server then reads the client address from the forwarded header; it uses only the last entry, which the host's own proxy adds, because a visitor can write the earlier entries). The server refuses to start in production if the origin is a wildcard or not https, if `BOT_CHECK_ENABLED` is not true, or if the Turnstile secret is missing. Errors name the setting and never print its value.

**Database migrations:** Prisma's migration system for all schema changes, tested in staging before production, never manual production database edits.

**Scheduled jobs required for:** 12-month data retention deletion, moving affiliate commissions from pending to payable 30 days after the payment, Day Pass/subscription expiry checks (if not handled via lazy check-on-request), monthly usage counter resets. Specific scheduling mechanism left as an implementation detail.

**Domain & hosting:** usegradea.com (registered, DNS managed at the registrar). The backend host must run Node 26 (the project pins Node 26.13.0) and offer PostgreSQL 18 (or a matching version), because staging and production should match local development. Two repositories, each with its own `staging` and `main` branch (`main` is production, `staging` is staging). Two deployments per environment: `gradea-frontend` (Vercel) and `gradea-backend` (Render, region Frankfurt, with the database on Neon Postgres 18 in Frankfurt; deployed when Phase 1 needs it, not in Phase 0). On Render's free plan the server sleeps after 15 minutes without traffic and there is no pre-deploy step, so the tables are created by running `prisma migrate deploy` by hand against Neon's direct (non-pooled) address, or on a paid instance through the pre-deploy command with `DIRECT_DATABASE_URL`. The build command is `npm ci --include=dev && npm run build` and the start command is `npm start`. Work happens on short-lived feature branches and reaches `staging`, then `main`, only by pull request, with type check, lint, the token audit (frontend) and tests passing first. The staging frontend calls the staging backend.

**Frontend deploy (free plan, build period):** Vercel's free plan will not deploy a private repo owned by an organization, and it is meant for non-commercial use. So a personal fork of `gradea-frontend` is the deploy copy. A GitHub Action in `gradea-frontend` runs the checks, then pushes `staging` and `main` into the fork, and Vercel deploys from the fork. Nobody works in the fork. When revenue allows, move to Vercel Pro (or another host), reconnect Vercel to the organization repo and delete the fork. The backend has no fork; its host reads `gradea-backend` directly.

**API address:** the backend is served on our own domain, never a host link. Production: `api.usegradea.com` (site at `usegradea.com`). Staging: `api.staging.usegradea.com` (site at `staging.usegradea.com`). The host only runs the server; a DNS record points the domain to it, with HTTPS. The frontend reads the API address from one environment setting per environment, never typed in code. Because the site and the API share the parent domain, the login cookie is set for `.usegradea.com` (httpOnly, Secure, SameSite=Lax), and staging uses its own cookie domain so the two never mix. CORS allows only the matching site origin (`https://usegradea.com` for production, `https://staging.usegradea.com` for staging). The Flutterwave webhook URL, the Resend settings and the Google sign-in redirect all use this address.

## 14. Traceability Matrix

| PRD Area | PRD Reference | SRS Coverage |
|---|---|---|
| Guest upload, signup-at-results gate | Section 7, 9 (flows), FR-3, FR-4 | SRS Section 4 (API), Section 5 (Auth), Section 7 (guest session handling) |
| Career level capture & override | FR-23, FR-24 | SRS Section 3 (User entity), Section 4 (signup/scan endpoints) |
| General & Smart Target scoring | Section 12, FR-7, FR-8 | SRS Section 3 (ScanResult), Section 6 (AI integration) |
| Free/PRO tier gating, usage limits | Section 8, 16, FR-9 through FR-12 | SRS Section 7 (entitlement enforcement) |
| AutoFix / Magic Write, validation | Section 13, FR-13 through FR-15 | SRS Section 3 (ImprovementAction), Section 6 (validateOutput) |
| AutoFix free trial | Section 14, FR-25 | SRS Section 3 (autofix_trial_used), Section 4 (unlock-line endpoint) |
| Download matching upload format | Section 14, FR-16, FR-17 | SRS Section 4 (generate/download endpoints) |
| Retention rules (12 months, Free vs PRO) | Section 18, FR-18, FR-19 | SRS Section 8 (file/data retention), Section 13 (scheduled deletion job) |
| Pricing, currency detection | Section 16, FR-21 | SRS Section 2 (geolocation service), Section 9 (billing) |
| Day Pass, launch promo | Section 16, FR-27, FR-26 | SRS Section 7 (expiry logic), Section 9 (checkout, promo cap) |
| AI failure handling, no fabrication | Section 11, FR-22 | SRS Section 6 (retry/validation), Section 12 (error logging) |
| No training on user data | Section 11 | SRS Section 6, Section 11 (provider config) |
| Security & privacy | Section 18 | SRS Section 5 (auth), Section 10 (security), Section 9 (payment data) |
| Success metrics (performance, validation rate) | Section 19 | SRS Section 6 (timeouts), Section 12 (validation logging) |
| Affiliate programme | Section 25, FR-50 | SRS Section 3 (Affiliate, ReferralVisit, Referral, Commission, Payout), Section 4 (affiliate API), Section 13 (commission release job) |
| Admin dashboard | Section 26, FR-51 | SRS Section 3 (User role, AdminAuditLog), Section 4 (admin API) |
| Admin Metrics screen | Section 19, Section 26, FR-51 | SRS Section 4 (`GET /api/admin/metrics`), Section 11 (PostHog), Section 13 (secrets) |
| Search and AI-search visibility | Section 27, FR-52 | SRS Section 4 (public files) |
| How-to video | FR-49 | SRS Section 11 (privacy-enhanced embed) |
| Coming-soon page (no email, frontend only) | Section 24, FR-55 | none |
| Coming soon features and votes | Section 24, FR-57 | SRS Section 3 (FeatureVote), Section 4 (`POST /api/feature-vote`) |
| Network status bar | FR-48 | Front end only; retry behaviour in SRS Section 12 |