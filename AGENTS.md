# AGENTS.md - Gradea Frontend (`gradea-frontend`)

**Companion documents:** Gradea PRD v2, Gradea SRS, Gradea Build Plan and the Screen List (read-only copies in `docs/`; the masters live in `gradea-backend`)

---

## 1. Purpose & Scope

This file governs how anyone, human or AI coding assistant, works in `gradea-frontend`. This repo holds everything the user sees: marketing pages, app screens, content files, design tokens, design PNGs and screen notes. The API, database, AI, payments, auth logic and emails live in `gradea-backend`, which has its own `AGENTS.md`.

The PRD, SRS and Build Plan decide *what* Gradea does and in *what order*. On product behaviour they win; on coding discipline this file wins. Flag a real contradiction, do not work around it.

Detailed rules live in `.claude/rules/` and load by file path. Task guides live in `.claude/skills/`. If a rule here and a rules file seem to conflict, stop and ask.

## 2. Core Non-Negotiables

1. **No templates or restyling at launch.** No CV template, builder or styling work before the PRD schedules it (PRD Section 21).
2. **CV and job description text never leave the session through the frontend's own tools.** Never put them, or anything typed into a scan, into analytics, logs, Sentry or recordings (PRD Section 19).
3. **The frontend never decides access or money.** Locked results arrive from the server already shaped for the plan. Never hide locked data with CSS or code. Never send an amount, price or referral code as the source of truth.
4. **The frontend never calls an AI provider, never touches the database and never imports backend code.** It talks to the backend only through the API.

## 3. How we work

- **Step by step.** Do one task at a time, report it, and wait for the next instruction. Stop and ask when a design, dev note, content file or token is missing.
- **Branches.** `main` is production and `staging` is staging. Never commit to either. Fetch first, then branch from the latest `origin/staging`. The founder opens and merges pull requests.
- **Commits.** Small, one change each, saying what changed and why and naming the PRD, SRS or Build Plan section where it applies. Stage files by name, never `git add -A`. End every commit message with:
  ```
  Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HVsKNxdAozc9Bi2dcNpn1e
  ```
- **Pushing.** Never push unless the founder says so. Never force push. Before a push, rebase onto `origin/staging` and stop on a conflict.
- **Installing.** Ask before installing anything. Exact versions only.
- **Docs.** The PRD, SRS, Build Plan and Screen List masters live in `gradea-backend/docs/`. The copies here are read-only: copy backend to frontend only, never the reverse, and never edit the other repo.
- **Build Plan ticks.** Tick each Build Plan item we build. Ticks go in the backend master and are copied over; a tick made only in the copy is lost at the next sync.
- **Writing.** No em dashes, anywhere: code, docs, commits or product text.

## 4. Stack and code

- **Stack:** Next.js 16 (App Router), React 19, TypeScript strict, CSS Modules, Zod, Vitest. No other library without updating the SRS first.
- **Shared API file.** `lib/api/shared.ts` is synced from `gradea-backend` and never edited by hand. When a sync adds an error code or other item that needs wording, add the wording in the content files.
- **API calls** go through `lib/api/client.ts`, which validates every answer with Zod. The API address is one environment setting, never typed in code. Nothing secret goes in a browser-readable variable.
- **Text lives in `content/`**, one JSON file per screen, with an `id` and `title`, sections in design order, and placeholders such as `{price}`. Shared text goes in `content/shared/`. No hard-coded user-facing wording in components.
- **Designs** are PNGs in `docs/design/`, one per screen state. **Screen notes** are in `docs/screens/`. Build a screen only from its design and notes.
- **Styling** uses only the tokens in `styles/tokens.css` (from `gradea-design-tokens.json`). Copy follows its voice rules: British English, sentence case, "CV", no emojis, no fake urgency. Prices are set in Inter.
- **No `console.log`, no empty `catch`, no secrets or real values** in files or logs. Never log, store or put an email in a URL.
- **Comments** name the PRD or SRS section where code enforces a rule that is not obvious.

## 5. Fewer requests

- **Poll with backoff.** Honour the server's `retry_after`, back off between polls, and stop once the result is settled.
- **Check the session once** per page load and share the answer; do not ask again in each component.
- **Combine requests.** Use one endpoint that returns what the screen needs instead of several small calls.
- **Debounce** typing-driven checks and requests.

## 6. Data and privacy

- Only these cookies: the login session cookie, the referral cookie (set by the backend for referral visitors) and the analytics cookie. Add no other without updating the PRD and the Privacy page.
- Analytics send actions, never content, through the one send function and the shared event list. No recordings on upload, scan or results screens.
- No email waitlist. The coming-soon page collects nothing and calls no API.
- Admin pages carry noindex and stay out of the sitemap. The site is not installable.

## 7. Tests

- While building, run only the tests for the files you changed and their key cases. Run the full `npm run check` once, at the end, before the final commit.
- Write tests for real risks (tier gating, privacy, content wording for every screen state), not long lists of tests for small rules.
- Never skip, delete or weaken a test to get green.
