# Gradea — Build Plan

**Companion document to:** Gradea PRD v2, Gradea SRS

---

## Overview

**Designs rule.** The Figma designs are exported as PNG, one image per screen state, into `docs/design/`, a little at a time, named by screen ID, screen name and state, separated by " - " (for example `G12 - Coming-soon landing page - Error.png`). Each phase lists the screens it needs. Before a phase starts, those images must be in the folder. The agent builds a screen only from its design. If an image is missing, stop and ask. Do not guess a screen.

This Build Plan sequences Gradea's MVP development into 10 phases (plus two small launch phases, 9B Affiliate programme and 9C Admin dashboard, and a post-MVP outline), ordered by dependency: foundational infrastructure first, then the core scan loop, then features that build on it (Smart Target, PRO capability, the dashboard, paywall UX), then billing, generation, the marketing site, and finally launch readiness. Each phase has a defined scope and a "done when" condition, so progress can be checked concretely rather than assumed.

This plan assumes the PRD and SRS as settled inputs. Where a phase depends on an open item from either document (e.g., final payment provider selection), that dependency is called out explicitly.

**Note on the community:** the welcome email (Phase 1) includes an invite to Gradea's X Community (primary, linked first) and a secondary Reddit community for anonymous sharing for users to share their own CV-improvement experience (score progress, feedback learned, wins), not a general support or troubleshooting channel. Creating and seeding this community is a founder-owned, non-engineering task, not a Build Plan phase, and does not block any phase's completion. It should ideally have some real activity before public launch, so the welcome email isn't linking new users to an empty space.

---

## Phase 0 — Coming-soon page

**Designs needed in `docs/design/` before this phase starts:** G12 Coming-soon landing page (empty, filled, joined and error states).

- Repositories: in the `usegradea` GitHub organization, `gradea-frontend` (Next.js, TypeScript) and `gradea-backend` (standalone API server, TypeScript, Prisma, PostgreSQL). Each has `main` (production) and `staging` branches, branch protection (pull requests only, checks must pass), its own `AGENTS.md`, `CLAUDE.md`, `.claude/rules/` and `.claude/skills/`. The backend repo also holds the master `docs/`; the frontend repo holds read-only copies plus the design PNGs and screen notes. Work happens on feature branches.
- CI/CD: a GitHub Action in each repo runs the checks on every pull request. In `gradea-frontend`, a second Action runs after the checks pass on `staging` or `main` and pushes that branch into the personal deploy fork, which Vercel deploys (SRS Section 13). The fork token is stored as a secret in the organization.
- Shared file: the backend writes the API data shapes and the analytics event list into one generated file, and the frontend keeps a copy, made by hand until Phase 1 (SRS Section 2).
- Frontend setup (`gradea-frontend`): `next/font` with Lora 700 and Inter 400, 500, 600 and 700 (with Inter's `latin-ext` subset), `styles/tokens.css` imported once, the token audit passing, and the content-file loader with generated types.
- Backend (`gradea-backend`): a `waitlist` table (email, created date, source of `launch` or `job_board`; one row per email) and one endpoint to join it, with the rate limit and hidden spam check. A repeat sign-up returns the joined state and adds no duplicate.
- The coming-soon page built from the design (G12) with the content JSON file, using the four states. The Job board waitlist page (G11) uses the same endpoint later with source `job_board`.
- PostHog with the shared event list and the privacy limits from PRD Section 19 (first events: page view and waitlist form submitted).
- Deploy: staging and production for both repos (frontend through the deploy fork on Vercel, backend on its own host, chosen in this phase), then usegradea.com pointed at the production frontend and `api.usegradea.com` at the production backend (staging uses `staging.usegradea.com` and `api.staging.usegradea.com`). The waitlist form calls the API on our own domain from day one. One email is sent only when Gradea opens, with an unsubscribe link (not built in this phase).

**Done when:** a visitor can open usegradea.com, see the coming-soon page, and join the waitlist with an email. A bad email shows the error state and a repeat email shows the joined state. The email is saved once, and the page and the endpoint are live in production.

---

## Phase 1 — Foundation

**Designs needed in `docs/design/` before this phase starts:** A4 Sign up / Log in, A5 Forgot password, A6 Account link confirm, H1 Welcome email, H2 Password reset email.

- Repository setup (the repos exist from Phase 0): linting and formatting conventions and environment variable scaffolding in each repo. A feature that needs both sides is built backend first (endpoint, merged), then frontend (screen), as two pull requests. The two talk only through the API. From this phase, a GitHub Action in `gradea-backend` opens a pull request in `gradea-frontend` whenever the shared generated file changes.
- API on our own domain (pointed in Phase 0): the API address stays one environment setting in `gradea-frontend` per environment. Set the login cookie for `.usegradea.com` (httpOnly, Secure, SameSite=Lax), and allow CORS only from the matching site origin (SRS Section 13).
- Database: PostgreSQL provisioned, Prisma schema implemented for all entities (User, ScanSession, ScanResult, ImprovementAction, UsageCounter, Subscription/Transaction), initial migration applied.
- Auth (in `gradea-backend`): email/password signup/login, Google OAuth, JWT issued by the backend and kept by the frontend in an httpOnly cookie, password hashing, guest session token issuance and 30-minute expiry logic. Includes account linking confirmation (a Google login matching an existing email/password account requires the user to confirm by entering their existing password before linking, never silent auto-link) and the password reset flow (`POST /api/auth/password-reset`, via Resend).
- `lib/ai/` abstraction skeleton: module structure and function signatures (`extractContent`, `scoreOverview`, `scoreLineDetail`, `autoFixLine`, `magicWrite`, `validateOutput`) stubbed with placeholder/mock responses. The abstraction boundary is established from day one, real provider integration comes in Phase 2.
- Deployment pipeline: staging and production environments, preview deployments per pull request, secrets management configured.
- Error tracking: Sentry (or equivalent) wired in from the start.
- Frontend fonts and tokens: set up `next/font` in `gradea-frontend` with Lora weight 700 and Inter weights 400, 500, 600 and 700, using `variable: "--font-lora"` and `variable: "--font-inter"`, and include Inter's `latin-ext` subset so the naira sign renders. Import `styles/tokens.css` once, globally. The token audit (`node scripts/build-design-tokens.mjs --audit` in `gradea-frontend`) must pass.
- Usage analytics: PostHog set up with the shared list of event names and one send function, with the privacy limits from PRD Section 19 (actions only, no content, no recordings on scan screens, no full IP). Events are then added screen by screen as each screen is built.
- Content files: set up the `content/` folder (app, marketing, emails, shared) and a small loader with types generated from the JSON keys, so a missing or misspelled key fails at build time. Each screen's JSON is split into sections that mirror the parts of the screen, with states beside the text. Written during design (step 4), one file per screen.

**Done when:** a developer can sign up, log in via email/password or Google, and the database correctly stores a user with career_level and subscription_status defaults. No scan functionality yet.

---

## Phase 2 — Core Scan Loop (General Analysis)

**Designs needed in `docs/design/` before this phase starts:** A1 Upload (General), A3 Signup wall, B1 Processing, B2 Error states, B3 Results home, B4 Open category, B5 Locked category, D1 Guest session expired, E7 Limit reached, S2 App top bar and account menu.

- Guest upload flow: file upload UI, validation (PDF/DOCX, 2MB max), guest session token attached to the upload, with career level override available at upload time (defaults to the user's stored profile value once signed in, editable per scan without changing the stored default).
- `extractContent()` real implementation: DeepSeek integration, file parsing (PDF/DOCX libraries), structured CV output, schema validation, 8-second timeout and retry-then-fail behavior.
- `scoreOverview()` real implementation: GPT integration for General Analysis, overall score + 4 category scores, calibrated to career level, 10-second timeout and retry-then-fail behavior.
- Signup-at-results gate: guest submits, hits signup wall (career level captured here, blurred placeholder results preview, consent line, no email verification at launch, but disposable/throwaway email domains are blocked at signup via a maintained blocklist; a default-off feature flag is reserved for 6-digit-code verification later; the same invisible checks run on both signup paths, the wall after a guest upload and the direct signup/login page: throwaway blocklist, mail-domain check, and an invisible bot check, with the button showing "Creating your account..."; guest upload also gets the bot check and rate limiting), account created, `claim` endpoint reattaches the scan session, scoring runs, results displayed.
- Welcome email sent on signup completion (via Resend): brief Free tier explainer, a nudge back to finish their first scan if incomplete, and an invite to the X Community first, with Reddit as secondary (see note above), framed around sharing their own CV-improvement journey, not as a support/help channel.
- Free tier usage enforcement: `UsageCounter` check before scan processing, 5 General scans/month limit, upgrade modal when exceeded, calendar-month reset logic.
- Results view: overall score + 4 category scores and per-category issue counts displayed. For Free, line-level detail is open for the lowest-scoring category only (scoped `scoreLineDetail` call) and locked/blurred for the rest (full paywall visual treatment refined in Phase 6).
- Original file discarded after extraction; only extracted structured content persisted.
- Results layout by screen size: desktop three panels (left rail 248, middle 440, CV fills the rest); tablet rail becomes tabs with detail and CV side by side; phone is step by step (score and categories list, then category detail with a back arrow, with a View on CV toggle). Only desktop and phone are designed in Figma. Tablet is not designed, but it is built properly from the desktop and phone designs using the same tokens, so the app is fully responsive at every width. Spacing and breakpoints per the design tokens file.
- Progressive results: the results view renders as soon as `scoreOverview()` returns; line detail (`scoreLineDetail`, scoped to the one open category for Free, full for PRO) loads in place with a loading state. If it fails after retry, the user keeps their scores and sees an inline retry, and no scan is consumed.
- Processing and error states: processing screen with a "taking longer" state past about 15 seconds; unreadable-file, AI-failed (retry works if extraction succeeded, otherwise re-upload) and details-failed states. The monthly-limit check runs before processing and shows as an upgrade modal on the Upload screen.

**Done when:** a guest can upload a CV, sign up, and see a real General Analysis score and category breakdown, with Free tier's monthly limit correctly enforced and the original file not retained.

---

## Phase 3 — Smart Target (Job-Specific Analysis)

**Designs needed in `docs/design/` before this phase starts:** A2 Upload (Smart Target), C1 Job-specific results, C2 Keyword breakdown, B6 Re-score popup, D4 Feedback form.

- Job description input UI, paired with the CV upload flow (guest-accessible, same signup-at-results gate pattern as General Analysis). Accepts pasted text (primary, always-reliable) or a URL from a recognized ATS platform allowlist (Greenhouse, Lever, BambooHR, and similar; test Workday, Jobberman and MyJobMag and add each only if it reads reliably, and name only tested sites in the helper text), with `fetchJobDescriptionFromURL()` attempting the fetch and gracefully falling back to a "please paste the text" prompt on any failure or unrecognized domain.
- `scoreOverview()` extended for Smart Target mode: Relevancy Score and Keyword Gap summary generation.
- Results-view General / Job-specific switch: reuses the CV already in the session, no re-upload. Re-score action and More menu (Dashboard, Download CV, Feedback) in the results header.
- Free tier's separate Smart Target limit: 1 scan/month, tracked independently from General Analysis via the same `UsageCounter` mechanism.
- Job description handling: stored with its Smart Target session (up to 12 months), deleted with the session or account, never logged, never used for training. AutoFix and Magic Write use it on Job-specific results.
- Results view: Relevancy Score and top-level keyword summary displayed, full keyword breakdown locked for Free.

**Done when:** a user can paste a job description alongside their CV and receive a real Relevancy Score and keyword summary, with the 1/month Free limit enforced separately from General Analysis, and job description text confirmed deleted when its session or the account is deleted, and absent from logs.

---

## Phase 4 — PRO Features (Line Detail, AutoFix, Magic Write, Validation)

**Designs needed in `docs/design/` before this phase starts:** C4 AutoFix draft, C5 AutoFix missing facts, C6 AutoFix failed, C8 Magic Write, C10 Changes made, D2 Fair-use pause.

- `scoreLineDetail()` real implementation: full line-by-line flagged feedback, 12-second timeout, triggered automatically for PRO scans (General and Smart Target).
- `autoFixLine()` real implementation: drafts a rewrite for a specific flagged line, handles the `missingFactsRequest` path, 8-second timeout.
- `magicWrite()` real implementation: converts user-supplied facts into a polished bullet, 8-second timeout.
- `validateOutput()` real implementation: checks AutoFix/Magic Write output traces back to source content or user-supplied facts. This is the mechanical enforcement of Gradea's "never fabricate" promise and should be treated as a genuinely important build item, not a rubber-stamp check.
- Magic Write entry points (rail, weak-area card, missing keyword, AutoFix "I don't know"), Free locked preview with a labeled example, and placement of an approved bullet via a job/project dropdown.
- "Changes made" list with Undo for approved changes, and a "Re-score my working copy" option for PRO (no upload, counts as a scan). Failed validation regenerates once before showing a failure message. Fair-use pause message.
- Per-line approve/reject UI: PRO users review each suggestion individually, approved changes update the working copy (original CV never modified).
- `ImprovementAction` entity fully wired: tracks status and validation result per line.

**Done when:** a PRO user can run a scan, see full line-by-line detail, trigger AutoFix on a flagged line, get a real draft (or a request for missing facts), approve or reject it, and the validation step demonstrably catches any output that can't be traced to real source content.

---

## Phase 5 — Dashboard & Profile

**Designs needed in `docs/design/` before this phase starts:** F1 Dashboard, F2 Score history, F4 Historical Review, F5 Profile, F8 Delete account and data, F9 Empty states, H6 Account deleted email.

- Reserve a usage display area on the dashboard (PRO unlimited at launch with a quiet fair-use limit of 20 scans and 40 AutoFix or Magic Write actions per day per account, rolling 24 hours, kept in config; 80 percent quiet alert, 100 percent pause banner with the end time; credit top-ups are post-MVP).
- PRO plan chip in the results view (Day Pass shows real time remaining). Re-score modal (score chip, upload, career level Change per scan, scans left for Free, job description box in Job-specific mode).
- Dashboard view: subscription status (Free or PRO, plan cycle if PRO), usage remaining for the current month (Free: General and Smart Target counts), whether the lifetime AutoFix trial has been used.
- Career level: display of the stored profile default, with an editor (`PATCH /api/profile/career-level`) to update it, separate from the per-scan override built in Phase 2.
- Free tier score history log: list of past scans by date and score only, no stored file or content, 12-month retention.
- PRO Historical Review: list of past sessions by date and score, each openable to the full retained session (analysis detail, flagged lines, AutoFix/Magic Write actions taken), 12-month retention, job description text included for Job-specific scans.
- Paywall surfacing on the dashboard itself: Free users see what PRO unlocks in context here too, not just within scan results, per PRD Section 15.
- Account menu (avatar) in the signed-in top bar: Dashboard, History, Profile, Billing, Sign out. Free and PRO dashboard states per PRD Section 15, with empty states for new users and a trend line on score history. No separate compare screen at launch.
- Profile page (launch scope): email (read only), career level, change password (email users only, `POST /api/auth/change-password`), Google status. Email change and data export are deferred.
- Self-serve account deletion (`DELETE /api/account`, PRD FR-47): confirmation popup with typed DELETE and re-authentication, automatic renewal cancellation, hard delete of user content, retained payment records, final confirmation email.

**Done when:** a signed-in user can view their subscription status, usage, career level, and score/session history (matching their tier's depth) from one dashboard, and can update their career level independent of any specific scan.

---

## Phase 6 — Free Tier AutoFix Trial & Paywall UX

**Designs needed in `docs/design/` before this phase starts:** C3 Free trial unlock, C7 Trial used, C9 Magic Write locked, B7 Get PRO preview popover, E6 Upgrade popup.

- `unlock-line` endpoint: lets a Free user select exactly one flagged line, checked against `autofix_trial_used`.
- On unlock: that line's real detail is revealed (triggers `scoreLineDetail` scoped to just that one line), AutoFix runs on it using the same mechanics as PRO.
- Trial is consumed only when a validated draft is shown (failures and validation rejections never consume it). One free "Try another version" on the same line.
- After one use, `autofix_trial_used` set permanently true, AutoFix locks for that account, UI reflects this.
- Paywall UX polish: locked/blurred previews get final visual treatment, Magic Write shown as fully locked with upgrade CTA, upgrade prompts placed contextually (within results, on dashboard).
- Active promotion of the trial: a visible prompt within results, not something a user has to discover.

**Done when:** a Free user can genuinely experience AutoFix once, on one self-chosen line, see it lock afterward, and see PRO features clearly but tastefully teased throughout the app.

---

## Phase 7 — Billing (Payments, Currency, Day Pass, Launch Promo)

**Designs needed in `docs/design/` before this phase starts:** E1 Pricing and plan picker, E2 Order summary, E3 Payment in progress, E4 Payment success, E5 Payment failed or cancelled, E8 PRO ending and expired, E9 Renewal problem, F6 Billing, F7 Cancel renewal confirmation, H3 Plan ending reminder, H4 Renewal failed email, H5 Payment confirmed (late).

**Dependency:** the payment provider is Flutterwave. The founder's business registration must be complete before this phase starts, since Flutterwave requires a registered business.

- Payment provider integration.
- Geolocation service integration: IP-based lookup on landing, NGN/USD determined before the pricing page renders, manual override option for incorrect detection.
- Checkout flow: plan selection (Day Pass, Weekly, Monthly, 3-Month), correct currency applied, launch promo discount applied if eligible and under the 20-redemption cap.
- Webhook handling: signature verification, subscription state updates, fail-safe behavior on malformed/unverifiable webhooks.
- Auto-renewal logic: only Monthly and 3-Month renew automatically, and only for card payments (provider card authorization). Day Pass and Weekly are one-off and never renew (Weekly gets a Renew button and a reminder email 1 day before it ends). `cancel-renewal`, `resume-renewal` and `update-card` endpoints. Cancelling keeps access until the paid period ends.
- Renewal reminders and failed charges: reminder email 3 days before each automatic charge; a failed charge is retried twice over 3 days with emails and a "Fix payment method" prompt, then the plan ends into the 24-hour grace period.
- Plan changes: `GET /api/billing/quote` with proration credit for upgrades to a longer plan (credit on the price actually paid, discount only, never a refund); downgrades at next renewal; stacking for same or shorter non-renewing purchases; Day Pass hidden while a longer plan is active; launch offer not applied to upgrades.
- Checkout and payment states: order summary (E2) with renewal consent, non-refundable line and the credit line; "Confirming your payment" screen polling `payment-status`, a "taking longer than usual" state after about 60 seconds; failed or cancelled state ("You were not charged"); success returns the user to where they were; pay button locks after one tap; idempotent webhooks.
- Logged-out visitor flow: plan chosen on the pricing page, sign up, then straight to the order summary with that plan selected. Currency stays the one paid in.
- Launch offer sold out: offer tags and "spots left" text disappear at 20 redemptions.
- Expiry handling: Day Pass and subscription expiry move the user to a 24-hour download-only grace state, then to Free automatically. Banner with deadline and Renew action. Saved PRO sessions are locked, not deleted, and restore on repurchase. Cancelling renewal keeps access until the paid period ends. No refund flow (purchases are non-refundable).
- "Get PRO" preview popover content: benefits, Day Pass and Weekly prices in local currency, and the launch offer line driven by the real redemption counter (shown only while spots remain; Monthly and 3-Month only).
- Dashboard billing display: current plan, renewal status, time remaining for an active Day Pass. Billing page with the seven states in PRD Section 15 (Free, Day Pass or Weekly, Monthly or 3-Month by card, renewal cancelled, paid by transfer, grace, expired), payment history from `GET /api/billing/history`, and the billing-error contact link (temporary support email until the domain is registered).

**Done when:** a user in Nigeria sees NGN pricing and can complete a real payment; a user elsewhere sees USD pricing and can do the same; a Day Pass expires correctly after 24 hours; the launch promo correctly stops after 20 redemptions.

---

## Phase 8 — Generation & Download

**Designs needed in `docs/design/` before this phase starts:** B8 Download.

- Generation logic: produces a downloadable file reflecting the user's content (original, for Free users without a trial change; original plus their one trial AutoFix change, for Free users who used it; the full working copy with all approved changes, for PRO).
- Format matching: output format always matches the original upload format, no conversion logic needed.
- ATS-safe formatting: consistent structure and clean formatting applied without restyling or applying any visual template.
- Performance target: generation completes within 5 seconds.

**Done when:** a user can generate and download a CV that reflects their approved changes, in their original upload format, within the 5-second target.

---

## Phase 9 — Marketing Site

**Designs needed in `docs/design/` before this phase starts:** S1 Marketing nav and footer, G1 Homepage, G2 General Analysis page, G3 Smart Target page, G4 Pricing page, G5 Privacy, G6 Terms, G7 Contact, G8 About, G9 Not found (404), G11 Job board waitlist page.

- Build the structure: nav (Product, How It Works, Pricing, Login, Get Started), and the 9 page sections (Hero, Trust bar, How It Works, Two Products, Scoring Categories, Free vs PRO, Social Proof, Final CTA, Footer).
- Apply the finalized brand system: navy/green/amber palette, Lora for display, Inter for body/UI, restrained single-hue gradients only (hero background, score-reveal glow).
- Hero scan animation and "How It Works" scroll-reveal animations.
- NGN/USD toggle on the Pricing section, wired to the same geolocation service from Phase 7.
- Frontend-design skill guidance pulled in during this phase for actual typography, spacing, and color execution.
- Pages per PRD Section 24: Homepage, General Analysis page, Smart Target page, Pricing page (shared design with the in-app plan picker, with FAQ), Privacy, Terms, Contact (with `POST /api/contact`), About (founder and future team photos), and a 404 page. Social proof section omitted until real. Footer with Product, Company, Legal and Community columns plus LinkedIn, X, TikTok and Instagram icons (each shown only once the profile exists).
- Hero sample CV is fictional and labelled. One shared upload component across Homepage, G2, G3 and the in-app Upload screen. Mobile first, collapsing nav. Page titles, descriptions and one share image for G2 and G3.
- Usage analytics (PostHog, Phase 1) running on the marketing pages, with the Privacy page naming its cookie. No cookie banner at launch. Privacy and Terms wording supplied (template or lawyer) before launch.
- "See how it works" video section under the hero: a click-to-play poster with a privacy-enhanced YouTube embed that loads only after the visitor taps play, never autoplay (PRD FR-49). A placeholder poster until the video is recorded. Also linked from the pricing FAQ.
- Footer additions: a YouTube icon (only once the channel exists), an "Earn with Gradea" link, and a "Coming soon" column (CV builder with templates by role, support for scanned CVs; no dates), per FR-53.
- Search and AI-search basics per PRD Section 27: server-rendered pages, titles and descriptions, sitemap.xml, robots.txt, llms.txt, structured data (Organization, SoftwareApplication, FAQ), plain factual About, Pricing and FAQ text. Google Search Console and Bing Webmaster Tools set up at go-live.
- Affiliate landing page (G10) and apply form (G11), once Phase 9B is ready.

**Done when:** usegradea.com (once registered) reflects the full locked structure and brand system, is responsive on mobile and desktop, and the upload widget in the hero connects directly into the Phase 2 guest scan flow.

---

## Phase 9B — Affiliate Programme

**Designs needed in `docs/design/` before this phase starts:** G10 Affiliate landing page, I1 Apply, I2 Application pending and approved, I3 Affiliate dashboard, I4 Payout request, I5 Programme terms.

- Data model per SRS Section 3: Affiliate, ReferralVisit, Referral, Commission, Payout.
- Public referral link `GET /r/:code` with the 30-day first-party referral cookie set only for visitors who arrive through a referral link, and a short notice shown only to them (PRD Section 22, item 10). Attribution is applied inside signup. Commissions are created inside the billing webhook handler, computed on the server: 20 percent of the first payment actually received, after any launch discount. Never from the browser.
- Apply flow and approval, affiliate dashboard (clicks, signups, paid conversions, earnings, payout request, private monthly top-affiliates board ranked by paid conversions with an opt-in display name), programme terms page.
- Scheduled job that moves a commission from pending to payable 30 days after the payment, and cancels it if the payment is reversed or fixed as a billing error.
- Payout details collected only at payout request, encrypted at rest, readable only by the admin payout screen.
- Payouts are paid by hand by Flutterwave transfer from the admin dashboard (Phase 9C), minimum 1,000 NGN, naira only. Affiliates are Nigeria-only for now. No paid affiliate tool.

**Done when:** a test referral goes from link, to signup, to first payment, to a pending commission, to payable after the hold, to a recorded payout, with every step visible in the dashboards and the audit log.

---

## Phase 9C — Admin Dashboard (minimal)

**Designs needed in `docs/design/` before this phase starts:** J1 Overview, J2 Users and user detail, J3 Subscriptions and billing errors, J4 Inbox, J5 Affiliates and payouts, J6 Abuse and audit log.

- `role` on User; admin routes checked on the server; sensitive actions need re-sign-in; the area carries noindex and is not in the sitemap.
- Screens and endpoints per SRS Section 4 and PRD Section 26: users and user detail (no CV content), grant or extend PRO by hand with a required reason, launch-offer counter, billing-error log, feedback and contact inbox, affiliate approvals and payouts, abuse view, audit log.
- Every admin action writes an AdminAuditLog row.

**Done when:** an admin can look up a user, fix a billing error, approve an affiliate and mark a payout paid, and every action appears in the audit log.

---

## Phase 10 — Polish & Launch Readiness

**Designs needed in `docs/design/` before this phase starts:** D3 Offline and server error.

- Scheduled jobs implemented: 12-month retention deletion (Free score logs, PRO Historical Review), Day Pass/subscription expiry sweep, monthly usage counter reset.
- Observability finalized: structured logging across the AI pipeline and payment webhooks, validation rejection rate made measurable.
- Full pass against PRD Section 20 (MVP Acceptance Criteria) and SRS Section 14 (Traceability Matrix), confirming every locked requirement is actually implemented and testable.
- Domain registration and go-live: usegradea.com registered and pointed at production hosting.
- Network status bar (PRD FR-48): a slim bar under the app top bar when the browser is offline or the connection is slow, with retry for interrupted uploads and scans, and no loss of typed text or chosen files.
- Final resolution check on remaining launch-blocking open items.

**Done when:** every item in PRD Section 20's acceptance criteria passes, retention and expiry jobs are confirmed running correctly, and the live domain serves the finished product.

---

## Post-MVP outline (not scheduled)

- **In-app CV builder with templates by role** (PRD Section 21): a structured two-pane editor with live preview, ATS-safe templates by role and career level, import from an uploaded CV, export to PDF and Word, AutoFix and Magic Write inside the editor, and the live Gradea grade beside it. Phase A: editor, 3 to 5 role templates, import, export, live grade. Phase B: more roles, AI helpers. Before building: decide the free versus PRO split, update the Privacy page and Terms (the builder stores what the user writes, until they delete it, and it is erased with the account), and tell existing users before it goes live.
- OCR for scanned or photographed CVs (priority raised), non-English CVs.
- Public affiliate leaderboard. Remaining PRD Section 21 items.