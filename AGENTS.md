# AGENTS.md - Gradea Frontend (`gradea-frontend`)

**Companion documents:** Gradea PRD v2, Gradea SRS, Gradea Build Plan (read-only copies in `docs/`; the masters live in `gradea-backend`)

---

## 1. Purpose & Scope

This file governs how anyone, human or AI coding assistant, works in the `gradea-frontend` repo. It holds everything the user sees: marketing pages, the app screens, content files, design tokens, design PNGs and screen notes. The API, database, AI, payments and emails live in `gradea-backend`, which has its own `AGENTS.md`.

The PRD, SRS and Build Plan are the source of truth for *what* Gradea does and in *what order* it is built. Where this file and those documents conflict, they win on product behaviour and this file wins on coding discipline. Flag a real contradiction, do not work around it. The copies in `docs/` are read-only. If one needs a change, the change is made in `gradea-backend` first.

**Rules and skills.** Detailed rules live in `.claude/rules/` and load by file path. Step-by-step task guides live in `.claude/skills/`. The rules for the database, uploads and AI, and the skills for the API, database, AI, jobs and emails, live in `gradea-backend`, not in this repo. Read the rules that apply to the files you touch. If a rule here and a rules file seem to conflict, stop and ask. Figma designs are exported as PNG into `docs/design/`, one image per screen state, named by screen ID, screen name and state, separated by " - " (for example `G12 - Coming-soon landing page - Error.png`). The Build Plan lists which screens each phase needs. Build a screen only from its design and its dev notes in `docs/screens/`. If a design is missing, stop and ask.

## 2. Core Non-Negotiables

No task, deadline or refactor justifies breaking these. If a task seems to require it, stop and flag it.

1. **No templates or restyling at launch.** Gradea does not restyle or template CV output in the MVP. An in-app CV builder is planned post-MVP (PRD Section 21) as its own project. Do not start any template, builder or styling work before it is scheduled through the PRD.
2. **CV and job description text never leave the user's session through the frontend's own tools.** Never put CV text, job description text or anything typed into a scan into analytics events, logs, error reports (Sentry) or recordings (PRD Section 19).
3. **The frontend never decides access or money.** Locked results come from the server already shaped for the user's plan. Never receive locked data and hide it with CSS or code. Never send an amount, a plan price or a referral code as the source of truth; the server computes them.
4. **The frontend never calls an AI provider, never touches the database, and never imports backend code.** It talks to the backend only through the API.

## 3. Codebase Conventions

- **Stack:** Next.js and TypeScript (strict mode). No deviation without updating the SRS first.
- **Two repos, one rule.** Screens, components, `content/` JSON and design tokens live here. Endpoints, the database, `lib/ai/`, payments, webhooks, auth, scheduled jobs and emails live in `gradea-backend`. A feature that needs both is built backend first (endpoint, merged), then here, as two pull requests.
- **Shared file.** The backend writes the API data shapes and the shared analytics event list into one generated file, and this repo keeps a copy (SRS Section 2). Never edit the copy. Change the backend file and copy it over. Until Phase 1 the copy is made by hand; from Phase 1 a pull request arrives automatically.
- **Branches.** `main` is production and `staging` is staging. Never commit to either directly. Work on a feature branch, open a pull request into `staging`, then release by a pull request from `staging` into `main`. Never edit the deploy fork.
- **Naming:** field names mirror the SRS data model (Section 3) or the generated types exactly, with no renamed variants.
- **Environment variables:** the API address is one environment setting per environment, never typed in code. Nothing secret goes in a variable the browser can read.
- **Written text lives in JSON content files, not in components.** Every screen has its own file (for example `content/app/upload.json`, `content/marketing/home.json`). Inside each file the text is split into sections that mirror the screen from top to bottom (for example `topBar`, `hero`, `uploadBox`, `footerNote`; on results: `topBar`, `leftRail`, `middleDetail`, `cvPanel`, `popups`), and each section holds its own states (empty, loading, error) beside the normal text. Every file starts with an `id` and a `title` (for example `"id": "A1", "title": "Upload"`) so it matches the screen list. Section names match the Figma design. Text used on many screens lives in `content/shared/`. Changing values use placeholders such as `{price}` and `{date}`. Long legal pages (Privacy, Terms) stay as plain text or Markdown files. Components read their words from these files; no hardcoded user-facing strings.
- **UI and copy:** all colours, fonts, spacing, shapes, components, states, motion and writing rules come from `gradea-design-tokens.json`, through `styles/tokens.css`. Do not invent values outside it. User-facing text follows its voice and copy rules (British English, sentence case, "CV", no emojis, no em dashes, no fake urgency). Prices are always set in Inter, since Lora has no Naira sign.
- **Marketing pages and phones:** desktop marketing pages are designed in Figma at 1440. Phone layouts are not designed; build them responsive from `gradea-design-tokens.json` ("marketing site", "layout"). The marketing content column is 1120 wide. Social icons live in the footer only. Use the "Logo / Lockup" rules in the tokens file, never redraw the logo.
- **Payments display:** every plan can be paid by card, bank transfer or USSD in naira, or by card in dollars. Only card payments auto-renew; transfer and USSD plans are one-off with a reminder email and a Renew button. Show this exactly as the content files say.
- **No age gate.** Do not add an age check or age rule to sign-up or the Terms.
- **Comments on non-obvious business logic:** where code enforces a PRD or SRS rule that is not obvious from the code alone, a short comment referencing the section is expected.

## 4. Data & Privacy Rules (frontend side)

- **Cookies are limited and named on the Privacy page.** The login session cookie is the essential one. The referral cookie is set only by the backend for visitors who arrive through a referral link (PRD Section 22, item 10). PostHog (PRD Section 19) sets its own cookie. Add no other cookie or tracker without updating the PRD and the Privacy page first.
- **Analytics send actions, never content.** Use the one send function and the shared event list only. No recordings on the upload, scan and results screens. Country and city only, no full IP, signed-in users identified by internal id only.
- **The how-to video is a click-to-play poster.** The privacy-enhanced YouTube embed loads only after the visitor taps play.
- **The API lives on our own domain.** Production `api.usegradea.com`, staging `api.staging.usegradea.com`. The login cookie is set by the backend for `.usegradea.com` (httpOnly, Secure, SameSite=Lax).
- **No email waitlist.** The coming-soon page collects no emails and makes no API call.
- **Admin pages** carry noindex and stay out of the sitemap. The server checks the admin role; the frontend never relies on hiding a link.
- **Affiliate programme is Nigeria only and naira only** (PRD Section 25). Show no dollar payout.

## 5. Testing Expectations

- Every screen state in its PNGs renders from its content file.
- A Free-tier response renders no locked detail. Tier-gated screens are tested with Free and PRO responses.
- Each analytics event fires once with only allowed properties.
- Accessibility is checked at a phone width: focus, labels, contrast, reduced motion.
- The token audit (`node scripts/build-design-tokens.mjs --audit`) passes with no raw colours, raw px or primitive tokens.

## 6. Git/PR Conventions

- **Commit messages** are clear and specific about what changed and why, referencing the PRD, SRS or Build Plan section when the change implements a locked requirement.
- **A PR that changes locked product behaviour** is not merged until the PRD and SRS (in `gradea-backend`) are updated to match.
- **Preview deployments** are used to look at a change before it reaches `staging`. Login and payments are tested on `staging.usegradea.com`, not on preview links.

## 7. When to Stop and Ask

Stop and ask the founder rather than guessing when:

- A task touches an open item in PRD Section 22 or the SRS open questions.
- A change would weaken any Core Non-Negotiable in Section 2.
- A design PNG, a dev note or a content file is missing.
- A new feature would expand what is collected or retained, add a template or builder before it is scheduled, or contradict a locked PRD decision.