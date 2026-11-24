# Gradea — Product Requirements Document (MVP)

**Domain:** usegradea.com (planned, not yet registered/live)

---

## 1. Table of Contents

1. Table of Contents
2. Product Overview
3. Problem Statement
4. Product Goals & Objectives
5. Target Users & Personas
6. User Research & Validation
7. Product Scope
8. User Roles & Permissions
9. User Stories & User Flows
10. Functional Requirements
11. AI System Requirements
12. CV Analysis Requirements
13. CV Improvement Requirements
14. CV Generation & Download Requirements
15. Dashboard Requirements
16. Subscription & Pricing
17. Non-Functional Requirements
18. Security & Privacy
19. Analytics & Success Metrics
20. MVP Acceptance Criteria
21. Post-MVP Roadmap
22. Open Questions & Decisions
23. Final MVP Definition
24. Marketing Website Structure
25. Affiliate Programme
26. Admin Dashboard
27. Search and AI-Search Visibility
28. Growth and Social Plan (non-product)

---

## 2. Product Overview

Gradea is a web application that gives job seekers an instant, honest grade on their CV, and shows them exactly what's holding it back, both in general, and against a specific job description. Gradea is a grading and feedback tool, not a resume builder. At launch it does not offer templates or design styling (an in-app CV builder with templates by role is planned post-MVP, Section 21). It works only with the content already on a user's CV. It never invents experience, skills, or achievements the user hasn't stated.

Gradea is built as two apps: a Next.js front end and a standalone Fastify API server (back end), both in TypeScript, with PostgreSQL and Prisma, and AI functionality provided by DeepSeek (extraction) and GPT (analysis, scoring, and improvement) behind a provider-agnostic abstraction layer. Gradea's direct competitor and closest reference model is Resume Worded.

## 3. Problem Statement

Job seekers rarely learn why their CV was rejected. Most rejections happen silently through ATS filters or a recruiter's fast first pass, with no feedback loop back to the applicant. Rewriting a CV for each application is slow and based on guesswork, without a reliable way to check whether it matches what a specific job actually asks for.

Career coaching solves this but is expensive and slow. Generic resume builders produce polished documents but don't evaluate content quality or job fit. They help you format a CV, not improve one. Gradea fills this gap: an instant, rubric-based grade (Impact & Achievements, Brevity & Style, Leadership Signals, ATS & Formatting), a job-specific match score when needed, and, for PRO users, AI-assisted fixes grounded in the user's real content. Free and fast, not a $49/month commitment.

## 4. Product Goals & Objectives

**Primary goal:** give a job seeker an accurate, actionable grade on their CV, both in general and against a specific job, and let them act on it directly through AI-assisted fixes, without ever fabricating their background.

**Secondary goal:** convert Free users to PRO by making the Free tier genuinely useful (5 General scans and 1 Smart Target scan per month, full scores, summary feedback) while reserving depth (line-by-line detail, AutoFix, Magic Write, unlimited scans, Historical Review) for PRO.

**MVP objectives:**
- A user can complete Upload, Analyze, and Download in one sitting without confusion.
- CV generation completes in under 5 seconds. Full analysis completes in under 15 seconds.
- AI Improvement (AutoFix, Magic Write) never introduces a fact not present in the user's original CV or explicitly provided by the user.

**Business objective:** validate 3 to 5 percent Free-to-PRO conversion within 30 days of signup, and 40 percent or higher 30-day return rate for Free users, while keeping AI cost per session sustainable against the locked pricing (Weekly, Monthly, 3-Month, NGN and USD).

## 5. Target Users & Personas

**User groups:**
- **First-time job seekers and recent graduates.** Limited CV-writing experience. Need to understand what "good" looks like and where their CV currently falls short.
- **Active job seekers and career switchers.** Have an existing CV but are unsure how well it matches a new target role or industry. Use Smart Target to check fit before applying.
- **High-volume applicants.** Apply to many roles in a short window. Need fast, repeatable scoring rather than one-off help, which is why PRO's unlimited scans matter most to this group.

**Primary persona:** a mid-level professional actively applying to new roles, who wants to know if their CV is even getting past automated screening before they keep applying blind.

**Secondary persona:** a career switcher moving into a new industry, who needs to know which of their past achievements are worth highlighting for a role outside their current field.

## 6. User Research & Validation

No formal user research has been conducted for Gradea. Product decisions in this document (pricing, tier structure, scoring categories) are based on competitive analysis of Resume Worded and adjacent tools, not direct user interviews or surveys.

Before or shortly after MVP launch, the following should be validated with real users:
- Whether the 4-category scoring rubric (Impact & Achievements, Brevity & Style, Leadership Signals, ATS & Formatting) matches what Nigerian and international job seekers actually find useful.
- Whether 3 to 5 percent Free-to-PRO conversion is realistic at the locked price points, or whether pricing needs adjustment once real usage and AI cost data are available.
- Whether the Free tier's monthly caps (5 General, 1 Smart Target) feel generous enough to prove value, or too restrictive to convert users at all.
- Whether the one-time AutoFix trial (Section 14) actually drives PRO conversion, or instead satisfies some users enough that they don't convert.

## 7. Product Scope

### 7.1 In Scope for MVP
- Guest CV upload for General Analysis and Smart Target (Job-Specific Analysis), no account required to submit.
- Signup required at the point of viewing results (after submission), matching Resume Worded's pattern. Signup via email/password or Google OAuth.
- Career level selection (Entry-Level, Mid-Level, Senior, Executive) captured at signup, stored as profile default, overridable per scan.
- General Analysis: CV Health Score across 4 categories (Impact & Achievements, Brevity & Style, Leadership Signals, ATS & Formatting), calibrated to career level.
- Smart Target (Job-Specific) Analysis: Relevancy Score plus Keyword Gap Analysis, run against a pasted job description.
- Free tier: 5 General scans and 1 Smart Target scan per month, summary-level feedback plus one fully open category (the lowest-scoring category that has at least one flagged issue; if none has any, the lowest-scoring one), one lifetime AutoFix trial (one chosen line, once per account), no Magic Write, score history log (score and date only, no stored file, 12-month retention).
- PRO tier: unlimited General and Smart Target scans, full line-by-line feedback, AutoFix (rewrites existing weak lines, asks for missing facts rather than guessing), Magic Write (facts-in, polish-out), full Historical Review (session content retained, 12-month retention, including the job description for Job-specific scans).
- Download in the same format as upload (PDF stays PDF, DOCX stays DOCX). No format conversion.
- No templates at launch. Output is the user's own content, cleanly reformatted for ATS readability. (An in-app CV builder with templates by role is planned post-MVP, Section 21.)
- Free tier paywall UX: locked/blurred previews of PRO-only detail, with upgrade prompts on click. AutoFix trial actively surfaced, not hidden.
- Subscription tiers: Free and PRO. PRO billed as a 1-Day Pass, Weekly, Monthly, or 3-Month, priced in NGN for Nigerian users and USD for international users based on geolocation.
- Payment via one local gateway handling both NGN and USD, Flutterwave (selected). Stripe is not used, as it is unavailable to Nigerian merchants. The founder will register a business, which Flutterwave requires.
- No free trial. Free tier serves as the trial. First-time purchases are non-refundable.
- Launch promotion: first 20 PRO subscribers get 50 percent off their first billing cycle only.
- Welcome email on signup completion, including a Free tier explainer and an invite to follow Gradea's WhatsApp channel, where the founder shares updates, CV tips and real CV-improvement stories (score progress, feedback learned, wins). A WhatsApp channel is one-way: followers read and react, and do not post. X Communities need a paid X plan, so neither an X Community nor a Reddit community is used at launch; other communities can be added after launch. The channel is a founder-owned, non-engineering effort, not a support or troubleshooting channel.

### 7.2 Out of Scope for MVP
- Cover letter generation.
- LinkedIn profile analysis or optimization.
- Interview preparation tools.
- Job search or job board integration. Decided as the next feature after launch (Section 21).
- Automated job application submission. Parked (Section 21).
- Recruiter- or employer-facing tools.
- Resume building or template selection at launch. Planned post-MVP as the in-app CV builder (Section 21).
- Inspiration Database (sample bullet library), parked pending sourcing decision.

## 8. User Roles & Permissions

| Role | Description | Permissions |
|---|---|---|
| Guest (unauthenticated) | Visitor who hasn't signed up | Can access the upload widget and submit a CV (and job description, for Smart Target) for analysis. Cannot view results until signup. |
| Free user | Signed-up user on the Free tier | 5 General scans and 1 Smart Target scan per month. Summary-level feedback only. One lifetime AutoFix trial (one line, once). No Magic Write. Score history log only (score and date, 12-month retention, no stored file or content). Download in upload format (PDF or DOCX). |
| PRO user | Signed-up, subscribed user | Unlimited General and Smart Target scans. Full line-by-line feedback. AutoFix and Magic Write, unrestricted. Full Historical Review, session content retained (12-month retention). Download in upload format. |
| Admin | Internal platform operator | Minimal launch scope in Section 26: user lookup, support actions, launch-offer counter, billing-error handling, feedback and contact inbox, affiliate approvals and payouts, abuse flags, audit log. No CV content visible by default. |
| Affiliate | A signed-in user approved for the affiliate programme (Section 25) | Own referral link, own stats, payout requests. Sees other affiliates only through the opt-in top-affiliates board. |

**Note:** Free tier's score history is a progress log only (score and date). PRO's Historical Review is a full archive (retrievable analysis, flagged lines, and any AutoFix/Magic Write actions taken for that session).

## 9. User Stories & User Flows

### 9.1 Core User Stories
- As a job seeker, I want to upload my CV and get an instant grade, so I know where it stands before I apply anywhere.
- As a job seeker, I want to paste a job description and see how well my CV matches it, so I can decide whether to apply and what to fix first.
- As a job seeker, I want to see my score and summary feedback without creating an account first, so I can decide if the tool is worth signing up for.
- As a PRO user, I want line-by-line feedback and AI-assisted fixes grounded in my real experience, so I don't have to guess how to rewrite weak bullets myself.
- As a PRO user, I want to see my past scan history, so I can track how much my score has improved over time.
- As a Free user, I want to see a hint of what PRO unlocks, so I understand what I'm missing without being blocked from using the free features I do have.

### 9.2 Guest to Free User Flow (General Analysis)
Land on homepage (or click Get started, which opens the upload page), upload CV (no account). On the General tab there is no scan button: choosing or dropping the CV goes straight to the signup wall (email/password or Google, plus career level selection, with a consent line), create account, scoring runs calibrated to career level, view score and summary feedback, see locked PRO preview sections, download CV in upload format.

### 9.3 Guest to Free User Flow (Smart Target)
Land on Smart Target page (or choose the Job-specific tab on the upload page), upload CV and paste job description (no account), press "Match my CV", hit signup wall (email/password or Google, plus career level selection), create account, view Relevancy Score and Keyword Gap summary, see locked PRO preview sections, download CV in upload format.

**Signing up or logging in directly:** a person who clicks Log in and then "Create an account" signs up on the sign-up page (A4) and lands on the upload page as a signed-in Free user, so they can scan right away. A returning user who logs in lands on the Dashboard, or goes back to a scan in progress. The Dashboard shows its empty "New user" state when the account has no scans yet.

### 9.4 PRO User Flow
Sign in, upload CV, choose General or Smart Target, submit (no limit check needed), view full line-by-line report, run AutoFix on flagged lines (approve or reject each rewrite individually), run Magic Write where needed (supply requested facts, approve resulting bullet), download improved CV, session saved to Historical Review.

### 9.5 Free Tier AutoFix Trial Flow
Free user views locked results, selects one flagged line to unlock using their lifetime trial, sees the real issue and AutoFix's drafted rewrite, approves or rejects it, AutoFix locks permanently for that account afterward, all other lines remain locked with upgrade prompts.

### 9.6 Edge Case Flows
- **Free tier limit reached:** user attempts a 6th General scan or 2nd Smart Target scan in the same month, sees an upgrade modal instead of the scan proceeding.
- **Insufficient CV content:** extraction succeeds but content is too sparse to meaningfully score. System flags this rather than fabricating filler.
- **Extraction failure:** file cannot be parsed. User sees a clear error and is asked to re-upload. No OCR or format conversion attempted in MVP.
- **AI provider failure:** analysis or AutoFix call fails or returns malformed output. System retries once, then shows a clear error. The failed attempt does not consume a usage credit.
- **File exceeds limits:** upload is not English, not PDF or DOCX, or exceeds 2MB. User sees a clear validation error before any AI call is made.

## 10. Functional Requirements

| ID | Requirement |
|---|---|
| FR-1 | The system must allow a user to create an account and sign in using either email/password or Google OAuth. |
| FR-2 | The system must allow a user to sign in and sign out. |
| FR-3 | The system must allow a guest (no account) to upload a CV, and for Smart Target, paste a job description, without signing up first. |
| FR-4 | The system must require signup before displaying analysis results, immediately after a guest submits a CV for scoring. |
| FR-5 | The system must accept CV uploads in PDF or DOCX format, English only, up to 2MB. |
| FR-6 | The system must extract and structure CV content before analysis can run. |
| FR-7 | The system must run General Analysis, producing an overall score and 4 category scores (Impact & Achievements, Brevity & Style, Leadership Signals, ATS & Formatting). |
| FR-8 | The system must run Smart Target Analysis against a pasted job description, producing a Relevancy Score and Keyword Gap Analysis. |
| FR-9 | The system must enforce Free tier limits of 5 General scans and 1 Smart Target scan per calendar month, blocking further scans with an upgrade prompt once reached. |
| FR-10 | The system must allow PRO users unlimited General and Smart Target scans. |
| FR-11 | The system must show summary-level feedback to Free users and full line-by-line feedback to PRO users. |
| FR-12 | The system must display locked, blurred previews of PRO-only detail to Free users, routing to the upgrade flow on click. |
| FR-13 | The system must allow PRO users to run AutoFix, drafting a rewrite for each flagged weak line individually, requesting missing facts from the user rather than inventing them. |
| FR-14 | The system must allow PRO users to run Magic Write, converting user-supplied facts into a polished bullet point, never inventing the underlying facts. |
| FR-15 | The system must let a PRO user approve or reject each AutoFix or Magic Write suggestion individually. |
| FR-16 | The system must generate a downloadable CV in the same format as the original upload (PDF stays PDF, DOCX stays DOCX). |
| FR-17 | At launch the system must not apply templates or restyle CV content; output reflects the user's own content, reformatted only for ATS readability. |
| FR-18 | The system must retain a Free user's score history (score and date only) for 12 months. |
| FR-19 | The system must retain a PRO user's full session content (Historical Review) for 12 months, including the job description text for Job-specific scans. |
| FR-20 | The system must let a user subscribe to PRO on a 1-Day Pass, Weekly, Monthly, or 3-Month cycle, and process payment through Flutterwave. |
| FR-27 | The system must grant full PRO access for exactly 24 hours from time of purchase for the 1-Day Pass, then automatically revert the user to Free tier limits without requiring cancellation. |
| FR-21 | The system must detect user region and display NGN pricing to Nigerian users and USD pricing to all other users. |
| FR-22 | The system must not consume a usage credit when an AI provider call fails. |
| FR-23 | The system must ask a user to select their career level (Entry-Level, Mid-Level, Senior, Executive) during signup, stored as their profile default. |
| FR-24 | The system must let a user override their career level for a single scan at upload time, without changing their stored profile default. |
| FR-25 | The system must let a Free user unlock exactly one flagged line, once per account lifetime, to see AutoFix's full behavior (draft, ask for missing facts, approve or reject). All other flagged lines remain locked. |
| FR-28 | The results view must include a General / Job-specific switch, letting a signed-in user run a Job-specific scan on the CV already in the session without re-uploading. The top bar also holds a Re-score action and a More menu (Dashboard, Download CV, Feedback). The original file is never kept, so there is no "Download original" option. |
| FR-32 | Re-score opens a modal showing the current score, an upload drop zone, the file rules, and the career level with a "Change" link. Change applies to that scan only and does not alter the stored default (changed on Profile). Free users also see scans remaining this month. In Job-specific mode the modal includes a job description box, because the job description is entered fresh for each new scan. Career level for a first-time guest is chosen on the signup wall, not on the Upload screen. |
| FR-33 | The results view must include a "Get PRO" preview popover (hover and click on desktop, tap on touch) listing PRO benefits, Day Pass and Weekly prices in the user's currency, and the launch offer only while it is real (50 percent off first cycle, Monthly and 3-Month plans, spots remaining out of 20). No fake countdowns, invented reviews or permanent discount badges. PRO users see a PRO plan chip instead, with real time remaining for a Day Pass. |
| FR-34 | The Free AutoFix trial is consumed only when a validated draft is shown to the user. AI failures and validation rejections do not consume it. Neither does answering "I don't know" to a missing-fact question, or closing the popup before a draft is shown. The user gets one free "Try another version" on the same line. |
| FR-35 | Magic Write is reached from the left rail (primary), from a weak-area card, from a missing keyword in Job-specific results, and from AutoFix when a user does not have a requested fact. In that case a PRO user is taken to Magic Write. A Free user is not sent to a locked tool: the popup closes with the line "No problem. Pick another flagged line.", the AutoFix trial stays unused, and a quiet text link ("See how it works") opens the locked Magic Write preview with a clearly labelled example only. Free users see a locked preview with a clearly labeled example only, with nothing generated. On approval, the user chooses which job or project (from their extracted CV) the bullet is added to, and it is appended to that entry's bullets. |
| FR-36 | Job-specific results are their own view: the Relevancy Score, the Keyword Gap summary and a list of "lines to tailor for this job". The job description is kept with the scan (FR-54), so AutoFix and Magic Write work on Job-specific results the same way as on General. Free users see the Relevancy Score, the keyword counts per group and the matched keywords, with the missing keywords locked (shown only as a count per group and a PRO lock), and one open group of lines to tailor, with the same one-time AutoFix trial as General (one lifetime trial in total, not one per mode). PRO users see everything. Missing keywords are actionable via Magic Write. |
| FR-54 | The job description (pasted or fetched from a link) is stored with its Job-specific scan, for as long as that scan's results are kept (up to 12 months), so AutoFix, Magic Write and Historical Review can use it. It is deleted when the user deletes the scan or the account. Gradea never uses it to train or fine-tune any model, it is never shown to other users, and it is never written to logs or error reports. Direct personal details (emails, phone numbers, links) are stripped before it is sent to an AI provider. Privacy and Terms must state this before launch, without claiming anything about the provider's own terms. |
| FR-37 | The results view shows passed checks in green, highlights the CV for the selected category (never color alone: a second cue such as underline style or icon), shows a "+X points" change only when a previous General scan exists, and renders the CV from extracted content (a clean rebuilt view, not the original file). |
| FR-29 | PRO usage is unlimited at launch, protected by a quiet fair-use limit that blocks abuse only. Decided 11 Nov: starting values are 20 scans per day and 40 AutoFix or Magic Write actions per day per account, on a rolling 24 hours, the same for all PRO plans. At 80 percent the founder gets a quiet alert (nothing shows to the user). At 100 percent the friendly pause banner shows with the time the pause ends (AutoFix, Magic Write, Undo and Re-score are paused, view and download still work). The banner shows no numbers, so the limit can change without a design change. Review after 30 days with real cost data. The dashboard reserves space for a usage display so credit top-ups can be added post-MVP. |
| FR-30 | The signup wall must show a blurred placeholder results preview (decorative, not a real score, since scoring runs only after signup) with honest copy such as "Your results will be ready in seconds". |
| FR-31 | Signup does not require email verification at launch (matching common competitor practice), to avoid adding a wall at the signup step. Signup rejects known disposable/throwaway email domains (e.g., Mailinator) using a maintained open blocklist, with the message "Please use a real email address". Real providers of any kind (Gmail, Yahoo, Outlook, school, work, custom domains) are accepted; there is no allowlist. The same invisible checks run on both signup paths (the signup wall after a guest upload, and the direct Sign up / Log in page): the throwaway-domain blocklist, a check that the email domain can receive mail (catches typos such as gmial.com), and an invisible bot check (no puzzle for real users). While they run, the button shows "Creating your account..." (never "Verifying", since the inbox is not being verified). Failures show a plain message such as "Please use a real email address". The guest upload step also has the invisible bot check and rate limiting, since it is unauthenticated. Google sign-in is inherently verified. A 6-digit-code verification flow is designed as a switchable setting, off at launch, to be turned on (gating the free AutoFix trial first) if fake-signup abuse or bounced emails become a problem. |
| FR-38 | When PRO access ends (Day Pass expiry, or a plan not renewed after cancel-renewal), the user gets a 24-hour download-only grace period: they can view saved results and download their working copy, but cannot run new fixes, Magic Write, Undo or Re-score. The saved session is kept for 12 months, locked until PRO is purchased again. A banner shows the deadline and a Renew action. Cancelling renewal never removes access already paid for. Purchases are non-refundable, so there is no refund flow. |
| FR-39 | PRO users can Undo an approved change (restoring the original line, or removing a Magic Write bullet) from a "Changes made" list, and can choose "Re-score my working copy" in the Re-score modal, which scores the CV with their approved changes without re-uploading and counts as a scan. |
| FR-40 | Magic Write and AutoFix drafts that fail validation are automatically regenerated once before a "couldn't write a safe version" message is shown. Magic Write always offers a Copy button, and if no suitable job or project exists on the CV the user is told and can copy the bullet. The PRO status chip shows real time remaining on a Day Pass, with a warning at one hour left. If the fair-use limit is reached, a friendly pause message is shown (threshold set from cost data, per FR-29). |
| FR-26 | The system must track how many users have redeemed the launch promotion and automatically stop offering it once the cap of 20 redemptions is reached. When the cap is reached, the offer tag and any "spots left" text disappear everywhere and standard prices show. |
| FR-41 | Renewal model: the Day Pass and Weekly plans are one-off payments and never auto-renew (Weekly shows a Renew button and a reminder email 1 day before it ends). Monthly and 3-Month auto-renew for card payments only; bank transfer and USSD purchases do not auto-renew and get the reminder email and a Renew button instead. Checkout shows clear consent before paying: renewal date and amount, "cancel anytime", and "purchases are non-refundable". Launch-offer buyers see "50 percent off your first cycle, then [full price]". |
| FR-42 | Cancelling renewal (Monthly and 3-Month) stops future charges and keeps PRO until the paid period ends, then the 24-hour download-only grace period applies (FR-38). A "Resume renewal" action is available any time before the period ends. Billing page offers Cancel renewal, Resume renewal and Update card. A "Renewal cancelled, PRO until [date]" banner is shown. |
| FR-43 | A reminder email is sent 3 days before each automatic charge (Monthly, 3-Month) and 1 day before a Weekly plan ends. If an automatic charge fails, it is retried twice over 3 days with an email each time and a "Fix payment method" prompt in the app; if it still fails, the plan ends and the 24-hour grace period starts. |
| FR-44 | Plan changes while PRO: upgrading to a longer plan (Weekly to Monthly, Monthly to 3-Month) uses proration. The unused value of the current plan, calculated on the price actually paid, becomes a discount on the new purchase and the new cycle starts immediately. The credit is a discount only, never a cash refund. Downgrades take effect at the next renewal. Buying the same or a shorter plan while on a non-renewing purchase stacks the new time after the current end date. The Day Pass is hidden while the user has a longer plan. The launch offer applies to new subscribers only, not to upgrades. The order summary shows the credit as its own line (for example "Credit for unused days: minus N"). |
| FR-45 | Payment states: after paying, the user sees "Confirming your payment". If confirmation takes longer than about 60 seconds, a "taking longer than usual" state says access will switch on automatically and an email will follow, with a support contact. The pay button locks after one tap to prevent double payment. Failed or cancelled payment shows "You were not charged" with Try again. After success, the user returns to exactly where they were. |
| FR-47 | Self-serve account deletion at launch. Profile has a quiet "Delete my account" link at the bottom. A confirmation popup lists what will be erased (saved CV content, scan results, score history, Historical Review sessions), says it cannot be undone, and, if a plan is active, says the plan ends now and purchases are non-refundable. Any automatic renewal is cancelled automatically so a deleted user is never charged again. The user confirms by typing DELETE; email users also enter their password and Google users re-confirm with Google. Afterwards the user is signed out and sent a final "Your Gradea account has been deleted" email. Only payment records (date, amount, reference) are kept for accounting and dispute purposes; they hold no CV content. |
| FR-46 | A logged-out visitor who chooses a plan on the pricing page must sign up first, then lands on the order summary with that plan already selected. A user keeps the currency they paid in for that plan even if their detected location changes. |
| FR-48 | Network status bar: a slim bar under the app top bar appears when the browser goes offline ("You're offline. We'll reconnect when you're back online.") or when requests are slow ("Slow connection. This may take longer."), and disappears when the connection recovers. Typed text and chosen files are never lost. Uploads or scans interrupted by a lost connection show a clear message with a retry (design screen D3). |
| FR-49 | How-to video: a short video on how to use Gradea sits in a "See how it works" section directly under the homepage hero, and is linked from the pricing FAQ. It is a click-to-play poster image (a privacy-enhanced YouTube embed that loads only after the visitor taps play), never autoplay, so no cookie banner is needed. |
| FR-50 | Affiliate programme at launch, small version (Section 25): application and manual approval, a personal referral link, a 30-day attribution window, a one-time 20 percent commission on the referred user's first payment, a 30-day hold before a commission is payable, open to people in Nigeria only for now, a minimum payout of 1,000 naira, manual monthly payouts by Flutterwave transfer, an affiliate dashboard, and our own tracking with no paid third-party tool. No signup bonus. No commission on renewals. |
| FR-51 | Admin dashboard, minimal at launch (Section 26): admin-only role, user and subscription lookup, support actions, launch-offer counter, billing-error handling, feedback and contact inbox, affiliate applications and payouts, abuse flags, a Metrics screen for usage numbers (Section 26), and an audit log of every admin action. |
| FR-52 | Search and AI-search visibility (Section 27): server-rendered marketing pages, sitemap, robots file, titles and descriptions, structured data, an llms.txt file, plain factual text on About, Pricing and FAQ, and Google and Bing webmaster tools set up at launch. |
| FR-53 | Footer additions: the social icon row (six-icon set, each icon shown only once its link is filled, see Section 28), an "Earn with Gradea" link, and a "Coming soon" column with one link to the Coming soon page (G13, FR-57). |
| FR-55 | Before launch the site shows a Coming-soon landing page (G12) with the logo, a short line about what Gradea does, and the social icons (an icon is a link only when its link is filled). There is no email box and no waitlist: Gradea collects no emails at this stage. It stays in place until the full marketing site is released. |
| FR-56 | Removed. Gradea does not run an email waitlist. If one is wanted later, it is added as a new requirement with its own design and privacy text. |
| FR-57 | A Coming soon page (G13) lists four planned features: Job board, CV builder with templates by role, Support for scanned CVs and Mobile app. Each card has an "I want this" button. One tap counts one vote for that feature, with no email needed. No numbers are shown to visitors, and a visitor can vote once per feature (checked in the browser; this is a signal, not an exact count). The votes decide which feature is built after launch, so the order in Section 21 can change when real votes exist. |

## 11. AI System Requirements

The AI layer must be accessed only through a provider-agnostic abstraction (`lib/ai/`). No application code outside this abstraction may reference a specific provider's SDK, request format, or response shape. The abstraction must allow the provider or model for any task to change without modifying calling code elsewhere in the application.

DeepSeek is the intended provider for CV and job description extraction and structuring. GPT is the intended provider for scoring, Relevancy analysis, Keyword Gap analysis, AutoFix, and Magic Write. This mapping is a starting configuration, not a hard constraint. The abstraction must allow tasks to be reassigned to different providers later.

If a provider call fails or returns output that does not match the expected schema, the system must not pass that output to the user. It must retry once, then fail visibly, and must not consume the user's usage allowance for the failed attempt.

AutoFix and Magic Write must never generate a fact (employer, title, date, skill, metric, achievement) that is not present in the user's original CV or explicitly supplied by the user in response to a direct prompt. If a rewrite requires a fact the AI does not have, it must ask the user for that fact rather than inferring or inventing it.

Gradea never uses user CV or job description content to train or fine-tune any model. Direct personal details (name, address, emails, phone numbers, links and social handles) are stripped before text is sent to an AI provider, and put back on Gradea's side afterwards. Gradea chooses provider settings that limit use of submitted data where the provider offers them, but does not claim a guarantee for any provider's own terms. The Privacy page, the About page and the "How we handle your data" text on the upload screen must say plainly that an AI provider reads the CV text, with personal details removed first. They must not say "no training by providers" or "nothing personal is ever sent".

The AI must never be the source of truth for authentication, authorization, entitlements, usage limits, payment state, or file storage. These remain application-layer responsibilities.

**Provider validation.** DeepSeek (extraction) and GPT (scoring, Relevancy analysis, Keyword Gap analysis, AutoFix, Magic Write) are the confirmed MVP starting providers, chosen for cost efficiency on mechanical extraction work and strong instruction-following on judgment-heavy generation work. This pairing is provisional, not permanent. Before final model selection, and periodically afterward, the following must be validated using real CV samples, leveraging the provider-agnostic abstraction to compare candidates without changing application logic:
- DeepSeek's extraction accuracy across varied, messy real-world CV formats (inconsistent formatting, tables, multi-column layouts, unusual date formats), since extraction errors are silent and compound into every downstream score and rewrite.
- Which specific GPT tier (cost vs. capability) is used for AutoFix and Magic Write, and how reliably it holds the "never fabricate, ask for missing facts" instruction under real prompts, compared against at least one alternative provider (e.g., Claude), before locking in as the permanent default.

## 12. CV Analysis Requirements

### 12.1 General Analysis
- Input: an uploaded and successfully extracted CV. No job description required. Available to guests (pre-signup, results gated behind signup) and to signed-in users.
- Output: an overall score (0 to 100) and 4 category scores:
  1. **Impact & Achievements**: quantified results vs. duty-listing, weak action verb detection, accomplishment-oriented language, verb tense consistency, repetition.
  2. **Brevity & Style**: bullet length (in code only, over 220 characters, 24 Nov), filler words, buzzwords and cliches, passive voice, personal pronouns, spelling.
  3. **Leadership & Growth Signals**: evidence of leadership, teamwork, communication, analytical skills, and drive across roles.
  4. **ATS & Formatting**: file parseability, date format consistency, punctuation consistency, page density, section structure, contact details. Held to the highest bar of the four (21 Nov). The AI sees only the CV's text, so it checks only what text can show: contact details, standard section headings, bullets and symbols, a job title, company and dates on every role, and table-like lines. The AI never judges how long a line is, in any category (24 Nov). Date styles (full or short month names, MM/YYYY, the year only) are compared in code, never by the AI. Checks on the file itself are done in code with no AI (built 22 Nov): columns, tables, images or graphics bigger than an icon, contact details in the page header or footer, and many or decorative fonts in a PDF; tables, text boxes, columns, text in the header or footer, and images in a Word file. They are conservative (only what is clearly a problem), read the file only in memory during the upload, keep only what they found, never the file, and never fail a scan. Each one found is an ATS & Formatting issue that counts like a flagged line in that category's count and score, is shown with a short plain reason only when ATS & Formatting is the open category, and marks no CV line. Same CV, same result: when a signed-in user scans the same file with the same CV text again at the same career level (a Word file and a PDF of the same CV are checked separately), Gradea shows the earlier result instead of scoring it again; it still counts as one scan (decided 21 Nov).
- Scoring for Impact & Achievements and Leadership & Growth Signals must be calibrated against the user's selected career level (Entry-Level, Mid-Level, Senior, Executive) for that scan.
- Line by line (decided 22 Nov): for each category the AI reviews every line of the CV one by one against a short checklist for that category and gives each line a verdict, fine or flagged. Gradea's own code also checks the lines exactly, with no AI. Brevity & Style: the same run of four or more words in two or more lines; three or more bullets in one role starting with the same word; a bullet over 220 characters (changed 24 Nov from 30 words); I, my, me, we or our; and mixed tenses inside one role (clear cases only). ATS & Formatting: a link shown only as a word in the contact details (GitHub, LinkedIn, Behance, Portfolio, Website) with no address, and a date with no leading zero, like 5/2022. A line flagged by both the code and the AI counts once, so the scores still follow the real lines. Brevity & Style and these code checks never judge the wording, length or separators of a skills line or a contact line (24 Nov): reading a file drops the gaps between skills, so they cannot be known. Checks on the file itself are described above (ATS & Formatting). Thin CV (24 Nov): when the CV has too little text or too few bullets for the career level, Gradea's code adds a short message beside the file issues, shown when ATS & Formatting is the open category; it is a message only and changes no count and no score.
- Free tier: overall score and 4 category scores fully visible, with the flagged-issue count shown on every category (locked or open). Line-level detail is fully open for exactly one category, as a taste of real value: the lowest-scoring category that has at least one flagged issue (a tie goes to the category with more flagged lines, then the fixed order Impact & Achievements, Brevity & Style, Leadership & Growth Signals, ATS & Formatting). If no category has a flagged issue, the lowest-scoring one opens and shows a "No issues" state (decided 21 Nov). Score and flags agree: a category scored low always comes with at least one flagged line to work on; missing evidence (for example a bullet that does not say who was led) counts on the line where it should have been shown. Line detail is built for all four categories on every scan; category scores are then computed from the real flagged lines, not from the AI's guess: a category with no problem line scores 95, and one with problem lines scores lower the larger the share of its lines that are flagged (changed 24 Nov, so a short CV with problems on most lines is not scored like a long one): 89 less 50 times that share, less 1 for each line, and in ATS & Formatting less 10 for each issue in the file itself, never below 30, so it always sits below a clean one; no category ever scores 100; the overall score is the average of the four category scores (decided 21 Nov). The AI's first scores are shown while line detail runs and are replaced when it is done. A Free user still only sees the open category's lines. The results page also shows (decided 21 Nov): the person's whole CV beside the lines, on every tier (it is their own CV), with only the open category's flagged lines marked; each flagged line's job or project, such as "Product Designer at Acme", taken from that entry's own heading and left out when the heading is unclear; one short plain sentence about the open category's flagged lines, from the same AI answer, kept only when it claims nothing the lines do not show (no locked category gets one); and passed checks, only those verified in code with no AI (contact details present, standard section headings, one date style across roles, a start date on every job), never one that a flagged line contradicts. A check that cannot be verified from the text (for example tables) is not claimed. All other categories show locked, blurred line-level previews, unlocking on upgrade. The one AutoFix trial line (Section 14) can be chosen from any flagged line the Free user can already see (the open category). The trial never reveals a line from a locked category.
- PRO tier: full line-by-line detail within each category, showing the exact flagged line and the reason.

### 12.2 Smart Target (Job-Specific) Analysis
- Input: an uploaded and successfully extracted CV, plus a job description, provided either as pasted text, or as a URL for a recognized ATS platform (Greenhouse, Lever, BambooHR, and similar publicly-readable job board platforms; Workday, Jobberman and MyJobMag are tested and added only if they read reliably, and the helper text names only tested sites). Available to guests and signed-in users, same signup-at-results-gate pattern as General Analysis.
- URL input is best-effort: if the URL is not from a recognized, fetchable ATS platform, or the fetch fails for any reason, the user sees a clear message and is prompted to paste the description text instead. Pasted text remains the primary, always-reliable input method.
- Output:
  - **Relevancy Score**: a compatibility percentage specific to the pasted job description.
  - **Keyword Gap Analysis**: matched vs. missing terms, grouped by hard skills, soft skills, job titles/certifications/tools, and industry language.
  - **Lines to tailor for this job**: CV lines that could match the job description better, each with AutoFix (FR-36). Free sees one open group, PRO sees all.
- Free tier: 1 scan per calendar month. Relevancy Score, the count of matched and missing keywords per group, and the matched keywords themselves are visible. The missing keywords are locked and unlock on upgrade. Their names are never sent to the browser for Free. The page tells Free users how many keywords are missing and that PRO shows them.
- PRO tier: unlimited scans, full keyword breakdown visible.
- The job description, whether pasted or fetched via URL, is stored with that Job-specific scan (FR-54) for as long as the scan's results are kept, up to 12 months, and is deleted with the scan or the account. Gradea never uses it to train models, and it is never written to logs.

### 12.3 Shared Analysis Requirements
- Both analysis types run on already-extracted, structured CV content. No manual re-entry required.
- Each scan is a self-contained session. There is no persistent, editable "CV library." A user re-uploads their CV each time they want a new scan.
- Analysis output is associated with the session it was generated in, for Historical Review (PRO) or the score log (Free).

## 13. CV Improvement Requirements

CV Improvement in Gradea consists of two PRO tools: **AutoFix** and **Magic Write**. Magic Write is fully PRO-locked. AutoFix is PRO-unrestricted, with a one-time lifetime trial available to Free users on a single chosen line (Section 14).

**AutoFix**
- Runs against a completed analysis. Drafts a rewrite for each flagged weak line individually, not as one combined pass over the whole document.
- If a rewrite requires a fact not present in the original CV (a number, a missing detail), AutoFix must ask the user for that fact directly rather than inferring or inventing it.
- The user reviews and approves or rejects each rewritten line individually. Approved lines replace the original text. Rejected lines remain as the user originally wrote them.
- AutoFix must never introduce an employer, title, date, skill, qualification, certification, project, metric, or achievement absent from the original CV or the facts the user supplied when asked.

**Magic Write**
- The user supplies raw facts about something they did (what, when, scale, outcome). Magic Write turns those facts into a polished, professional bullet point.
- On approval, the user picks which job or project the bullet belongs to (dropdown built from their extracted CV); it is appended to that entry (FR-35). There is no CV editor in MVP.
- Magic Write must never invent the underlying facts. It only improves the expression of facts the user has explicitly provided.

**Validation**
- All AutoFix and Magic Write output must pass through a validation step, separate from the AI generation call itself, that checks the result can be traced back to the original CV content or user-supplied facts before it is shown to the user.
- If validation detects content that cannot be traced back to a real source, that content is rejected and either regenerated or flagged, never silently shown.

**Versioning**
- The original uploaded CV is never modified. Approved AutoFix and Magic Write changes are applied to a working copy for that session, which becomes what gets downloaded and, for PRO, what's retained in Historical Review.

## 14. CV Generation & Download Requirements

At launch Gradea does not offer templates or restyling of any kind. (The post-MVP in-app builder, Section 21, will export its own CVs in PDF or Word.) The downloadable CV reflects the user's own content, reformatted only where necessary for ATS readability (consistent structure, clean formatting, no visual redesign). Open: whether a fixed CV keeps the person's original design or is a clean version built from the text is decided when Phase 4 starts (Build Plan). Today the uploaded file is not stored, so nothing here may assume that it is.

The exported file format matches the uploaded file format. A user who uploads a PDF downloads a PDF. A user who uploads a DOCX downloads a DOCX. No format conversion is offered in MVP.

For Free users, the download reflects their original content as uploaded, plus any single AutoFix change approved via their one-time trial.

For PRO users, the download reflects the working copy after any approved AutoFix or Magic Write changes, not the original unmodified upload.

**Free tier AutoFix trial:** Free users get one lifetime, one-time trial use of AutoFix, scoped to a single flagged line they choose from the flagged lines visible to them (the open category); it never reveals a line from a locked category. Same mechanics as PRO's AutoFix (draft, ask for missing facts if needed, user approves or rejects). After that single use, AutoFix locks permanently for that account and routes to upgrade. The trial counts only once a validated draft has been shown (FR-34), and the user gets one free "Try another version" on the same line. Magic Write remains fully PRO-locked with no free trial. This trial must be actively surfaced to the user (e.g., a visible prompt within the analysis results view, and messaging on the pricing/upgrade page), not left for them to discover on their own.

Generation must complete in under 5 seconds, as defined in Section 4 and Section 19.

## 15. Dashboard Requirements

The dashboard must show:
- Current subscription status (Free or PRO, and if PRO, the active plan cycle: 1-Day Pass, Weekly, Monthly, or 3-Month, including time remaining for an active Day Pass).
- Usage remaining for the current calendar month (Free: General scans used out of 5, Smart Target scans used out of 1). Not shown for PRO, since usage is unlimited.
- Whether the lifetime AutoFix trial has been used (Free tier only).
- The user's stored career level, with the option to update it.
- For Free users: a score history log listing past scans by date and score only, no stored file or content, retained for 12 months.
- For PRO users: full Historical Review, listing past scans by date and score, each one openable to view the full session (analysis detail, flagged lines, AutoFix/Magic Write actions taken), retained for 12 months.

**Paywall UX requirement:** for Free users, the dashboard must visibly surface what PRO unlocks, not just hide it. Locked previews of line-by-line detail, AutoFix, and Magic Write must appear in context (within a scan result, and here on the dashboard where relevant) rather than being invisible to Free users. Clicking any locked element routes to the upgrade flow.

The dashboard must clearly indicate when a Free user is approaching or has reached their monthly limit, before they attempt a scan that would be blocked.

**Dashboard states and account pages (locked in design Group F):**
- Free dashboard: scans left this month, AutoFix trial status, latest score, recent scans, a locked PRO preview card, and a warning before the limit is hit. PRO dashboard: plan chip (real Day Pass time left), renewal date, latest score, recent scans, and a reserved usage-display area.
- An account menu (avatar, top bar of every signed-in screen) holds Dashboard, History, Profile, Billing and Sign out.
- Score history shows a simple list and trend line (score and date for Free; full Historical Review for PRO, locked with a "Get PRO again" button after PRO ends). There is no separate "compare two scans" screen at launch; the "+X points" change (FR-37) and the trend line cover progress.
- Profile (launch scope): email (read only), default career level, change password (email sign-in users only) and Google sign-in status. Changing email is deferred, because email is unverified at launch and changing it would be an account-takeover risk. Data export is deferred.
- Billing page shows one of: Free (Get PRO); Day Pass or Weekly (plan, end date, Renew); Monthly or 3-Month by card (next charge date and amount, Cancel renewal, Update card); renewal cancelled ("PRO until [date]", Resume renewal); paid by transfer ("This plan does not renew automatically", Renew); grace (deadline banner, Renew); expired (sessions locked, Get PRO again). It lists payment history (date, plan, amount, status) from Gradea's own records; the receipt is the payment provider's email and no PDF receipts are built at launch. A "Charged twice, or paid and no access? Contact us" link opens a support email to support@usegradea.com.
- Empty states: a new user with no scans sees a clear "Scan your CV" prompt.

## 16. Subscription & Pricing

| Plan | Scope | NGN | USD |
|---|---|---|---|
| Free | 5 General scans/month, 1 Smart Target scan/month, summary feedback only, 1 lifetime AutoFix trial line, no Magic Write, score history log (12 months) | Free | Free |
| PRO Weekly | Unlimited scans, full line-by-line feedback, AutoFix, Magic Write, full Historical Review (12 months) | ₦1,500/week | $4.99/week |
| PRO Monthly | Same as above | ₦4,000/month | $9.99/month |
| PRO 3-Month | Same as above | ₦9,000/3 months | $24.99/3 months |
| PRO 1-Day Pass | Same PRO features as above, for 24 hours from time of purchase, then automatic revert to Free tier | ₦900/day | $2.99/day |

Currency is set by geolocation: NGN for users detected in Nigeria, USD for all other users. Payment is processed via a single provider, Flutterwave.

**Renewal rules:** Day Pass and Weekly are one-off payments. Monthly and 3-Month auto-renew for card payments, cancellable any time with access kept until the paid period ends (FR-41 to FR-44). Auto-renewal for Weekly can be revisited after launch using real data.

There is no free trial period for PRO. The Free tier itself serves as the trial. PRO purchases are non-refundable, matching industry-standard practice for freemium-to-paid conversion (Resume Worded follows the same policy). There is no refund flow. The only exception is a billing error: if a user is charged twice for the same purchase, or is charged but PRO access never switches on, the founder corrects it (reverses the duplicate charge or grants the access). This is an error correction, not a refund for change of mind, and is handled manually by the founder.

**Launch Promotion:** the first 20 users to subscribe to PRO (Monthly or 3-Month plan) receive 50 percent off their first billing cycle only. This is a one-time launch incentive, not a recurring discount, and does not apply to subsequent renewals. Once 20 redemptions are reached, standard pricing applies to all new subscribers.

**Free tier promotion of the AutoFix trial:** the one-time AutoFix trial must be actively surfaced to the user, not left for them to discover. This includes a visible prompt within the analysis results view (e.g., "See AutoFix in action, try it free on one line") and messaging on the pricing/upgrade page itself.

Pricing above is a starting point and should be revisited once real AI cost-per-session data is available, since a heavy unlimited-use PRO user's actual API cost has not yet been measured against these price points.

## 17. Non-Functional Requirements

- **Availability:** the platform must remain usable for core flows (upload, analysis, AutoFix, Magic Write, download) during normal operation. No formal uptime/SLA target is set for MVP. This should be revisited once there is real infrastructure and paying customers who would expect one.
- **Responsiveness:** the marketing site and web application must both be fully usable on desktop and mobile browser viewports, given the modern, animation-forward marketing site direction (Section 24).
- **Performance targets:** CV generation under 5 seconds, full analysis under 15 seconds, as defined in Section 4 and Section 19.
- **Scalability:** the architecture must support adding or swapping AI providers without a rewrite of core product logic, per Section 11.
- **Cost control:** PRO is unlimited at launch with a quiet fair-use limit against abuse (FR-29). AI provider usage must be tracked per session so cost-per-user can be measured against subscription revenue. This is especially important given unlimited scans for PRO. A specific cost ceiling per session is not yet defined, and current pricing (Section 16) should be revisited once real cost data exists.
- **Authentication security:** Google OAuth and email/password authentication must both follow standard secure practices for token handling and password storage (see Section 18).
- **Maintainability:** the codebase must follow a modular structure across two apps (a Next.js front end; a Fastify, TypeScript, Prisma and PostgreSQL back end) separating AI orchestration, business logic (auth, entitlements, payments, usage limits), and presentation.

## 18. Security & Privacy

- Passwords must be stored using an industry-standard hashing algorithm, never in plain text or reversible encryption.
- Google OAuth sign-in must follow standard secure token handling practice. Gradea does not store the user's Google password at any point.
- Uploaded CV content and job description text may contain personal data and must be stored with access restricted to the owning user and authorized system processes only.
- Free tier: score history (score and date only) retained for 12 months, then deleted.
- **Planned change when the post-MVP in-app builder ships (not at launch):** the builder stores the CV the user is writing, until the user deletes it, and it is erased with the account (FR-47). At that point the Privacy page and Terms are updated and existing users are told by email and an in-app notice before the builder goes live. The launch Privacy page keeps saying the original file is never kept, which is true today and stays true unless the Phase 4 export decision (Section 14, Build Plan) changes it, in which case this section, the Privacy page and the delete rules change first.
- **Affiliate payout details (Section 25):** the one new kind of financial data Gradea would store. Keep it minimal, encrypted, readable only by admin payout screens, and described in the Privacy page. Card and payment data of customers still never touches Gradea.
- PRO tier: full session content (Historical Review) retained for 12 months, then deleted. Job description text is kept with its Job-specific scan and deleted with it.
- Gradea never uses user CV or job description content to train or fine-tune any model. Direct personal details are stripped before text is sent to an AI provider (DeepSeek, GPT). Gradea chooses provider settings that limit use of submitted data where offered, but makes no guarantee about any provider's own terms, as locked in Section 11.
- Payment data is not stored directly by Gradea. Card and payment details are handled entirely by the payment provider (Flutterwave). Gradea stores only transaction references and subscription status.

**OPEN QUESTION:** formal data protection compliance scope (Nigeria's NDPA 2023, which replaced the earlier NDPR 2019, and whether GDPR applies given international users) is deferred post-launch, at the founder's discretion. Reference checklist for when this is revisited:

*NDPA (Nigeria):*
- Confirm whether Gradea's expected user volume triggers NDPC "Data Controller/Processor of Major Importance" registration thresholds.
- Confirm lawful basis for processing (consent via signup and terms).
- Ensure data subject rights are supported: access, correction, deletion on request. (Self-serve deletion is built at launch, FR-47; data export remains deferred.)
- Confirm technical security measures (encryption at rest and in transit).
- Establish a documented breach notification procedure.
- Determine whether a Data Protection Officer is required at Gradea's scale.

*GDPR (if EU users are meaningfully in scope):*
- Data minimization and storage limits (Gradea's 12-month retention caps are a head start here).
- Right to erasure (full deletion on request, not just natural expiry).
- Right to data portability (export user data on request).
- Explicit, unambiguous consent for data processing.
- Lawful basis for any cross-border data transfer.

## 19. Analytics & Success Metrics

**Usage tracking (decided 12 Nov 2026).** Gradea uses PostHog (free to start) to see how people use the site and the app: page views, clicks, screens reached, features used, funnels, searches, and where visitors come from by country and city. Rules:
- **Actions, never content.** Events carry the action and a few safe details (screen, plan, score band, search words). They never carry CV text, job description text, or anything typed into a scan. No screen recording on the upload, scan and results screens; masked or off everywhere else.
- **Searches are tracked** (for example Job board searches once it ships), so the founder can see what people look for. Only the plain search words are kept: a search that is very long, or that looks like an email address or phone number, is dropped before it is sent. Searches carry the visitor's country and city, so the founder can see which regions search for what. A region with fewer than 5 searches is grouped into "Other".
- **Regions** come from the visitor's IP as country and city only. The full IP address is not stored.
- **Signed-in users** are identified by their internal user id, never by email or name in event data.
- **Cookies:** PostHog sets no cookie and keeps nothing in the browser. Gradea itself sets only what is needed to work: the login session cookie, two short-lived (10 minutes) cookies during Google sign-in (one for the sign-in step, one while the person finishes sign-up or confirms linking), and the referral code only for visitors who arrive through a referral link (item 10 in Section 24). The Privacy page names each of them in plain words. No cookie banner at launch. Revisit if the audience outside Nigeria grows.
- **One list of event names** is kept in the code (frontend and backend use the same names), so every event is named the same way everywhere. Rules live in `.claude/rules/analytics.md`.
Product metrics for signed-in users (plans, scans, conversion) also come from Gradea's own database. The following are tracked from launch:
- Completion rate of the core flow (Upload, Analyze, and for guests, Signup, through to Download).
- Free-to-PRO conversion rate. Target: 3 to 5 percent within 30 days of signup.
- Retention: percentage of Free users returning for at least one more scan within 30 days of their first scan. Target: 40 percent or higher.
- CV generation time. Target: under 5 seconds.
- Full analysis completion time. Target: under 15 seconds.
- AI cost per session, tracked against subscription revenue per PRO user, to validate unit economics. No fixed ceiling defined yet, pending real usage data.
- Validation rejection rate (rate of AutoFix/Magic Write outputs rejected by the validation step in Section 13). Target: under 5 percent.
- Uptake of the one-time AutoFix trial among Free users, and its correlation with PRO conversion, since this is an unvalidated hypothesis per Section 6.

## 20. MVP Acceptance Criteria

Gradea's MVP is ready to launch when all of the following are true:

- A guest can upload a CV and submit it for General Analysis or Smart Target Analysis without creating an account first.
- A guest is prompted to sign up (email/password or Google) immediately after submitting, before seeing any results, and selects their career level during signup.
- A signed-up Free user can run up to 5 General scans and 1 Smart Target scan per calendar month, and sees an upgrade prompt when the limit is reached.
- A Free user sees their full overall score, category scores and issue counts on every category, with line-level detail fully open for their lowest-scoring category and shown as locked previews (routing to upgrade on click) for the rest.
- A Free user can use their one lifetime AutoFix trial on a single chosen line, and sees it locked afterward.
- A PRO user can run unlimited General and Smart Target scans, see full line-by-line feedback, and use AutoFix and Magic Write, approving or rejecting each suggestion individually.
- AutoFix and Magic Write never introduce a fact absent from the original CV or from facts the user explicitly supplied, verified by the validation step in Section 13.
- A user can update their career level at signup and override it per scan.
- The original uploaded CV is never modified. Downloads reflect the working copy for PRO users, and the original content (plus any trial AutoFix change) for Free users.
- Downloads are generated in the same format as the original upload (PDF or DOCX), with no templates applied.
- A Free user's score history (score and date only) and a PRO user's full Historical Review are both retained for 12 months and then deleted.
- A Nigerian user is shown NGN pricing and can complete payment via Flutterwave; a non-Nigerian user is shown USD pricing and can do the same.
- The launch promotion correctly applies 50 percent off the first billing cycle for the first 20 PRO subscribers, then stops automatically.
- A user who purchases the 1-Day Pass gets full PRO access for exactly 24 hours from purchase, then automatically reverts to Free tier limits without requiring manual cancellation.
- The dashboard accurately reflects subscription status, usage remaining (Free), career level, and score/session history.
- CV generation completes in under 5 seconds and full analysis completes in under 15 seconds under normal conditions.
- A failed AI provider call retries once, then shows a clear error, without consuming the user's usage allowance.
- The marketing site (usegradea.com) reflects the structure in Section 24: hero with live scan animation, How It Works, the two distinct products (General and Smart Target), the 4-category scoring explanation, Free vs PRO comparison, and functioning NGN/USD toggle.

## 21. Post-MVP Roadmap

The following are explicitly out of MVP scope and may be considered afterward, subject to real user validation per Section 6:

- Cover letter generation.
- LinkedIn profile analysis or optimization.
- Interview preparation tools.
- **Job board (next feature after launch, direction decided 11 Nov 2026).** Jobs are pulled from ATS platforms and career pages that permit it, and shown on a Gradea job board.
  - **Sources:** a list of company job pages we check regularly. When a company posts a new job we pick it up; jobs that close or disappear from the source are hidden automatically. A user can paste a job link (the MVP already does this for the description, Section 12.2). If the site permits it and a job is there, it is added to the board and its company becomes a source. Everyone sees every job on the board.
  - **What counts as permitted:** the site's robots.txt allows it, its terms do not forbid it, and we prefer public feeds or the structured job data a page already publishes. We keep a record of how each source was approved. Sites that say no are not used.
  - **Trust and safety:** every job shows its source and links to the original. A Report button for fake or bad jobs, and a way for a company to ask for removal.
  - **Apply:** Apply asks "Tailor your CV for this job first?", runs the Job-specific scan, then sends the user to the company's own apply page. Gradea never submits an application for the user at this stage.
  - **Free or PRO:** browsing, searching and saving jobs are free. Tailoring uses the existing Job-specific scan rules (Free 1 a month, PRO unlimited with fair use); no new limits. Re-scoring the same job after edits stays free.
  - **First filters:** keyword search, location (with Remote), company, date posted, job type, and experience level. Salary is shown only when the source gives it; there is no salary filter at first. Later: a "matches my CV" sort.
  - **Order:** sources and board, then filters and saved jobs, then tailor-then-apply, then application tracking (saved, applied, interview), then auto-apply last. Not decided: pricing beyond the rules above.
  - **Flow:** find a job (board or pasted link), see how well the CV matches, tailor it (Job-specific scan and AutoFix), apply on the company's own site, then track it.
  - **Research notes (11 Nov 2026, Sorce and Tsenta):** both products have a match-ranked job feed and an application tracker, and both auto-apply, which Gradea does not do at this stage. Sorce reviews complain most about wrong matches, fake or closed jobs, and applications that look submitted but never arrive. Gradea avoids the last one by sending users to the company's real apply page. Tsenta offers an "Aggressive" CV rewrite mode; Gradea has only the honest mode (no fabrication, Section 13). Gradea's edge is an honest score that shows what to fix, used for a "matches my CV" sort.
  - **Before promising it:** check how many Nigerian and African jobs exist on the sources we would use. Sorce is US only, and large ATS platforms mostly hold US and European jobs.
  - **Homepage update when the board ships:** a search-led hero (what and where) with the upload as the second path, a four-step strip (find, match, tailor, apply and track), a real sample result instead of borrowed logos or fake proof, and a short "what Gradea does not do" line.
- **Mobile app direction (decided 12 Nov 2026, after the MVP).** The main product becomes a real mobile app that people download from the app stores, because most African users prefer apps. The web version stays. The marketing website becomes simpler, pointing people to the app and the web version. The Job board is designed app first and shown on the web too. The MVP design is the base: the app screens are adapted to phone size, not redone. Open items, not decided:
  - **Accent color:** navy stays for the MVP and launch site. Whether the app uses the near-black (ink) as its accent, or adds a dark mode, is decided later by trying both on one screen.
  - **Store billing:** app stores usually require in-app digital purchases to use their own billing, and take a cut. Check how this applies in Nigeria and for the Flutterwave plans before promising the same prices in the app.
  - **Build approach:** not decided here (separate app, or one codebase for web and app).
- Automated job application submission (auto-apply). Parked. It needs more than the CV: cover letters, extra questions and per-company forms. Considered only after the job board and tracking exist.
- Recruiter- or employer-facing tools, team or enterprise accounts.
- Inspiration Database (sample bullet library), pending a decision on sourcing (AI-generated and clearly labeled as illustrative, versus real professional examples, which carries consent and identifiability risk). A RAG-capable engineer (frontend and backend/Python) is planned to join post-MVP specifically for this feature.
- PRO credit top-ups (buy more usage), to be considered once real AI cost-per-user data exists. At launch PRO stays unlimited, protected by a quiet fair-use limit (threshold to be set from cost data) that only stops abuse, not normal use.
- A browser extension or bookmarklet allowing users to capture a job description directly from login-gated or scraping-hostile platforms (e.g., LinkedIn), where a server-side URL fetch is unreliable or blocked. Reads the page as the user's own logged-in browser session rather than fetching server-side, sidestepping anti-scraping restrictions. Meaningfully more build effort than the MVP's ATS-platform URL paste (Section 12.2), including potential browser store submission.
- Format conversion between PDF and DOCX (currently, export format always matches upload format).
- Full local-currency display beyond the NGN/USD split, for users outside Nigeria whose local currency isn't USD.
- A formal uptime/SLA commitment, once real infrastructure and paying customer expectations justify one.
- Expanded language support for non-English CVs, and OCR support for scanned/image-based CVs. OCR priority is raised: many users have only a phone photo or scan of their CV.
- **In-app CV builder with templates by role and career level (replaces the earlier "no resume building at any tier" rule once it ships).** Modelled on tools like Kickresume but calmer and ATS-safe: a two-pane editor (fields on one side, live preview on the other), ATS-safe templates only (one column, standard headings, no skill bars or percentages), templates by role and career level with clearly labelled example bullets, import from an uploaded CV (the structured content already exists, so "Edit this CV" on the results page opens the builder pre-filled), export to PDF and Word, AutoFix and Magic Write working inside the editor under the same no-fabrication rules, and the Gradea score and flagged lines updating beside the editor as the user builds. A structured section-and-field editor, not a free-form word processor. Phase A: editor, 3 to 5 role templates, import, export, live grade. Phase B: more roles and career levels, AI helpers inside the editor. Needs decisions first: what is free versus PRO (custom sections stay free), the privacy change in Section 18, and the cost and time of building and writing the templates.
- Public affiliate leaderboard (launch has a private top-affiliates board inside the affiliate dashboard).
- **Gradea Campus Ambassador Programme (post-MVP plan).** A different approach from the affiliate programme: instead of asking people to share a link, Gradea recruits people who represent it inside their universities and student communities.
  - **Possible ambassadors:** university students, student association executives, tech community leaders, career community organisers, and NYSC members as a separate ambassador category.
  - **What they could do:** introduce Gradea to students, organise CV improvement sessions, promote Gradea at career events, share job-search resources, and encourage students to try the platform.
  - **Not decided:** how ambassadors are chosen, what they receive, how their work is measured, and the programme terms. To be decided after launch, with real student feedback.
- 6-digit email verification (built as a switchable setting, off at launch).
- Compare two scans (dropped at launch; the "+X points" change and the trend line cover progress).

## 22. Open Questions & Decisions

| # | Question | Status |
|---|---|---|
| 1 | Payment provider | Decided: Flutterwave. Founder confirmed that a business account can charge saved cards in NGN and USD, that USD cards allow repeat charges, and that custom amounts can be charged to a saved card (needed for proration). Remaining dependency: business registration. |
| 2 | Pricing sanity check against real AI cost-per-session data once available | Open, revisit post-launch |
| 3 | Admin role scope and capabilities | Minimal launch scope decided (Section 26). Fuller scope open, not launch-blocking |
| 4 | NDPA (Nigeria) and GDPR formal compliance review | Deferred, at the founder's discretion, checklist logged in Section 18 |
| 5 | Inspiration Database sourcing and whether to build it at all | Parked, post-MVP |
| 6 | Specific uptime/SLA target | Deferred, not needed for MVP |
| 7 | Whether the one-time AutoFix trial actually drives PRO conversion, or instead satisfies some users enough that they don't convert | Open, to be measured post-launch |
| 8 | Domain registration for usegradea.com | Open, planned but not yet registered or live |
| 9 | Affiliate commission rate and terms | Decided to start at 20 percent of the first payment, 30-day hold. Revisit once real AI cost per user is known |
| 10 | Affiliate attribution storage: a 30-day referral code kept in the browser is not an essential cookie, which conflicts with the no-cookie-banner decision | Open. Default for launch: store the code first-party only when a visitor arrives through a referral link, disclose it in Privacy, and show a short notice only to those visitors |
| 11 | Affiliate payout details (bank account) are a new kind of stored financial data | Open. Default: collect only at payout request, encrypted, minimal |
| 12 | In-app CV builder: free versus PRO split, privacy wording, build scope | Open, post-MVP |
| 13 | Admin dashboard fuller scope, a second admin role | Open, not launch-blocking |
| 14 | Job description retention | Decided 11 Nov: kept with its Job-specific scan (up to 12 months), deleted with the scan or account, never logged, never used by Gradea for training, and personal details stripped before it reaches an AI provider (FR-54). Privacy and Terms wording needed before launch. Copy on A1 and B6 must change |
| 15 | Fair-use limit values (FR-29) | Decided 11 Nov as starting values: 20 scans and 40 AutoFix or Magic Write actions per day per account, rolling 24 hours. Review after 30 days against real AI cost per scan. Watch the Day Pass closely |

## 23. Final MVP Definition

Gradea is a web application, built as a Next.js front end and a standalone Fastify API server, in TypeScript with PostgreSQL and Prisma, that gives job seekers an instant, honest grade on their CV. Guests can upload a CV and submit it for General Analysis or Smart Target (job-specific) Analysis without an account. Signup, via email/password or Google, is required at the point results are shown, and captures the user's career level, used to calibrate scoring.

Free users get 5 General scans and 1 Smart Target scan per month, full scores with summary feedback, a one-time lifetime trial of AutoFix on a single chosen line, and a lightweight score history log retained for 12 months. PRO users, subscribed as a 1-Day Pass, Weekly, Monthly, or 3-Month in NGN or USD based on geolocation, get unlimited scans, full line-by-line feedback, unrestricted AutoFix and Magic Write, and full Historical Review retained for 12 months. The 1-Day Pass gives urgency-driven users (e.g., an interview tomorrow) a low-cost way to access full PRO capability for 24 hours without a recurring commitment.

Gradea is a grading and feedback tool, not a resume builder. It offers no templates at launch (an in-app builder is planned post-MVP), and downloads always match the original upload format. It never fabricates experience, skills, or achievements. AutoFix rewrites only what already exists on the CV, asking the user for missing facts rather than guessing. Magic Write turns user-supplied facts into polished bullet points and never invents the facts themselves. Every AI output passes through a validation step before being shown to the user.

The AI layer sits behind a provider-agnostic abstraction, with DeepSeek and GPT as the initial providers, so providers can change without touching core product logic. Gradea never uses user data to train any model; direct personal details are stripped before text reaches a provider, and Gradea makes no guarantee about providers' own terms (Section 11). Authentication, entitlements, usage limits, payments, storage, and generation remain application-layer responsibilities, not AI responsibilities.

Gradea's positioning and feature set are directly benchmarked against Resume Worded, priced meaningfully lower to fit the Nigerian market and international job seekers who find $49 a month unrealistic. A launch promotion offering the first 20 PRO subscribers 50 percent off their first billing cycle supports early adoption.

The MVP is not launch-ready until the founder's business registration is complete, since Flutterwave requires a registered business. Pricing, NDPA/GDPR compliance, and the AutoFix trial's actual conversion impact should all be revisited once real usage data exists, at the founder's discretion.

## 24. Marketing Website Structure

**Navigation:** Logo, Product (General Analysis / Smart Target), How It Works, Pricing, Login, Get Started (primary CTA, opens the upload page, A1). On phones the nav collapses to a menu.

**Upload boxes on the marketing pages (decided 19 Nov):** on the General tab and on the General Analysis page there is no scan button; choosing or dropping a CV goes straight to the signup wall. On the Job-specific tab and on the Smart Target page the button stays ("Match my CV"), because a job description is needed first. The upload page (A1) follows the same rule. The marketing site is to be redesigned before Phase 9 (fuller General and Job-specific sections with animated demos), so the marketing frames are not changed until then.

**Page sections:**
1. **Hero.** Bold headline and one-sentence subheadline on instant AI grading. Upload widget embedded directly in the hero. Live, looping animation showing a clearly fictional sample CV (labelled "Sample CV", never a real person's CV) being scanned, score counting up, issue tags popping in as it goes; the score shown is illustrative.
1b. **See how it works (video).** Directly under the hero: a short how-to video as a click-to-play poster image with a play button, never autoplay (FR-49). Placeholder poster until the video is recorded.
2. **Trust bar.** Short, understated line on the core differentiator: no templates at launch, no fabricated experience, honest scoring (wording to be revisited when the builder ships).
3. **How It Works.** 3 to 4 steps (Upload, Get Scored, See What's Wrong, Fix & Download), shown horizontally with scroll-triggered reveal animation.
4. **Two Products.** General Analysis and Smart Target shown as two distinct cards with equal visual weight, each with its own short animated preview.
5. **What Gradea Actually Checks.** The 4-category breakdown, shown as interactive or animated cards, hover-to-expand with 1 to 2 example flags per category.
6. **Free vs PRO.** Clean comparison table, PRO column visually emphasized. NGN/USD toggle at the top, auto-set by geolocation, user-switchable.
7. **Social proof.** Left out at launch. Testimonials and usage counters are added only when they are real; no invented reviews, stats or user counts.
8. **Final CTA.** Repeat the upload widget or a strong "Get Started Free" button, full-width, high contrast.
9. **Footer.** Columns: Product (General Analysis, Smart Target, Pricing, How It Works), Company (About, Contact), Legal (Privacy, Terms), and Community ("Follow our WhatsApp channel"). Social icons in the order LinkedIn, TikTok, Facebook, YouTube, X, Instagram (icons only, each with an accessible text label, opening in a new tab). A social icon appears only when its link is filled (at first: LinkedIn, TikTok, YouTube, X); there are no dead links. An "Earn with Gradea" link (affiliate landing page) sits under Company. A "Coming soon" column has one link to the Coming soon page (G13). Pricing/currency note.

**Marketing pages (design Group G, locked):**
- G1 Homepage (the sections above). G2 General Analysis page and G3 Smart Target page, each a landing page with its own upload box (G3 also has the job description box). G4 Pricing page: Free vs PRO table, the four plans, NGN/USD switch, the real launch-offer counter while spots remain, and a short FAQ that matches the rules (what renews and what does not, non-refundable, Day Pass, 24-hour grace). G4 and the in-app plan picker are one shared design; a logged-out visitor chooses a plan, signs up, then lands on the order summary. G5 Privacy policy. G6 Terms of use (including non-refundable). G7 Contact page (support email support@usegradea.com and short form; the billing-error link points here). G8 About page. G9 Not found (404) page.
- **Added marketing pages:** G10 Affiliate landing page ("Earn with Gradea": how it works, the 20 percent first-payment commission, an Apply button, the programme terms). The apply form is I1 in Group I. G11 (the Job board waitlist page) was removed. G13 is the Coming soon page where visitors vote for what is built next (FR-57). G12 is the Coming-soon landing page. The affiliate dashboard is in design Group I; the admin dashboard is in design Group J.
- **About page** (linked from the footer and the trust line, not a homepage section): why Gradea exists (the founder's real story, written from facts the founder supplies, nothing invented); what we promise (no templates at launch, no fabricated experience, honest scoring; the wording is revisited when the builder ships); how data is handled (original file never kept, Gradea never trains on user data, an AI provider reads the CV text with personal details removed first, 12-month retention, link to Privacy; never "no training by providers" or "nothing personal is ever sent"); and who is behind it, with names and photos of the founder and any co-founders or founding team members who join later.
- **Shared rules:** the upload box is one component used on the Homepage, G2, G3 and the in-app Upload screen. Marketing pages are designed mobile first. G2 and G3 each have their own page title and description, and there is one share image for links on X, LinkedIn and WhatsApp.
- **Launch dependency:** the Privacy policy and Terms of use need real wording (from a template or a lawyer) before launch.

**Visual direction:** modern SaaS aesthetic, animation concentrated in the hero scan demo and the "How It Works" scroll-reveals, restraint elsewhere. Frontend-design skill guidance to be pulled in at build time for typography, spacing, and color system, rather than defaulting to generic templated styling.

## 25. Affiliate Programme

A small, low-cost programme, in the spirit of other CV tools' affiliate programmes (for example Teal's), with the rule that Gradea pays only when a referred person pays.

- **Who:** anyone who can introduce Gradea to people who may need it can apply. They do not have to be a Gradea customer or have used the product. They need a free Gradea account, which is how they get their link and see their earnings, and they earn a commission when a person they introduced makes their first purchase. Applications are approved by hand in the admin dashboard.
- **Link and attribution:** each approved affiliate gets a code and a personal link. A new signup who arrived through the link within the last 30 days is attributed to that affiliate (the most recent referral link wins). Self-referrals and people who already had an account do not count. Storage of the code is an open question (Section 22, item 10).
- **Commission:** 20 percent of the first payment actually received from the referred user, after any launch discount, one time only. No commission on renewals. No bonus for free signups, because that invites fake signups. Examples at launch prices: Day Pass 900 naira pays 180, Weekly 1,500 pays 300, Monthly 4,000 pays 800, 3-Month 9,000 pays 1,800.
- **Hold and cancellation:** a commission becomes payable 30 days after the payment. It is cancelled if that payment is reversed or fixed as a billing error.
- **Payout:** a minimum balance of 1,000 naira, paid in naira only, by hand once a month by Flutterwave transfer, approved in the admin dashboard. Nothing is paid out of pocket before a real payment has arrived, so the programme costs nothing if nobody pays.
- **Tracking:** in Gradea's own database. No paid affiliate tool.
- **Affiliate dashboard (design Group I):** clicks, signups, paid conversions, earnings (pending, payable, paid), a payout request, and a private monthly top-affiliates board ranked by paid conversions (not signups), with an opt-in display name. Recognition only, with a badge and a shout-out on X. No cash prizes. A public board is post-MVP.
- **Rules:** no self-referral, no fake signups, no spam, no misleading claims, no coupon or incentivised-traffic sites. Violations cancel commissions. Affiliates must disclose that they earn a commission. Gradea may change the rate for new referrals with notice.
- **Marketing the programme:** an "Earn with Gradea" link in the footer, the affiliate landing page (G10) and the apply form (I1), a line in the welcome email once the programme is live, and posts on X.
- **Design screens (new Group I):** I1 Apply, I2 Application pending and approved, I3 Affiliate dashboard, I4 Payout request, I5 Programme terms. Marketing page G10 is in Group G, and the apply form is I1.

## 26. Admin Dashboard

Internal, for the founder and later support staff. Minimal at launch, built from the existing design components, not indexed by search engines, and reachable only by a user with the admin role (with re-sign-in for sensitive actions).

- Users: search by email, see plan, status, usage and recent activity. No CV content is visible by default.
- Subscriptions: view state, grant or extend PRO by hand for a billing error (with a required reason).
- Launch offer: the live count of redemptions out of 20.
- Billing errors: a simple log of reported billing errors and their resolution.
- Inbox: feedback form submissions and contact messages.
- Affiliates: applications to approve or reject, commissions, and the monthly payout list to mark as paid.
- Abuse: blocked signups, rate-limit hits and flagged accounts.
- Audit log: every admin action is recorded with who, what and when.
- **Metrics (usage numbers from PostHog):** one screen, with a date filter (Today, 7 days, 30 days, All time) and a region filter (country first, then city; Nigeria listed first; the default is All regions). Regions with fewer than 5 searches are grouped into "Other". It shows:
  - Key numbers: visitors, searches, signups, checkout starts, each compared with the period before.
  - A per-day chart of visitors and searches.
  - Searches: total searches, top search words with counts, searches with no results (count, percentage and top words), searches by country and by city, and the search-to-click rate. Searches start when the Job board ships; until then the block shows "No data yet".
  - Where visitors come from: sources (Google, direct, social, affiliate links) and devices (phone, desktop, tablet).
  - Funnel: homepage, upload started, signed up, saw results, viewed pricing, started checkout, with the share of visitors at each step.
  - What people do: scans started, Job-specific switch, AutoFix, Magic Write, Re-score and downloads, plus marketing actions (main button clicks, pricing page views, feature votes on the Coming soon page, how-to video plays, social icon clicks).
  - Friction: failed uploads, offline or slow-connection screens, error screens shown.
  - A link out to PostHog for anything deeper. The screen shows real numbers only; where there is no data it says "No data yet", with no sample or invented figures. It never shows CV or job description text, and never an email address or full IP.
  - The operational numbers (today's scans, new users, revenue, errors, the "Needs you" list) stay on the Overview.
- **Design screens (new Group J):** J1 Overview, J2 Users and user detail, J3 Subscriptions and billing errors, J4 Inbox, J5 Affiliates and payouts, J6 Abuse and audit log, J7 Metrics (with a region-picked state and a no-data state). Designed after the product screens.

## 27. Search and AI-Search Visibility

Mostly build work, not design. The goal is to be eligible to appear in Google, Bing and in answers from AI assistants. Nobody can promise that an AI assistant will mention Gradea.

- Marketing pages are server-rendered full HTML, fast, with clear titles and descriptions, one H1 per page, and the share image.
- A sitemap, a robots file and an llms.txt file describing what Gradea is, how it works and its pricing in plain words.
- Structured data: Organization, SoftwareApplication and FAQ.
- Plain, factual text on About, Pricing and the FAQ, since assistants quote these. Real numbers only, never invented.
- Google Search Console and Bing Webmaster Tools set up at launch.
- Later: helpful CV guides and role pages (which the post-MVP builder also feeds).

## 28. Growth and Social Plan (non-product)

Not software requirements. Recorded here so they are not forgotten.

- The founder posts build-in-public progress updates on X while building, to grow presence before launch.
- Social icon set: six-icon set in this order: LinkedIn, TikTok, Facebook, YouTube, X, Instagram. First wave live: LinkedIn, TikTok, YouTube, X. Facebook and Instagram are designed but stay hidden until their accounts exist. An icon shows only when its link is filled. The same row is used on the coming-soon page, the footer and the emails. No WhatsApp group; a WhatsApp Channel may be added later. Reddit appears only in the welcome email.
- The how-to video (FR-49) is recorded once the product screens are final, and posted to YouTube.
- The WhatsApp channel is the community at launch, as described in the welcome email. X Communities need a paid X plan, so no X or Reddit community is created for now; others can be added after launch.