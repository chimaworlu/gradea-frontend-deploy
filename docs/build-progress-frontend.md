# Build progress — gradea-frontend

Progress against `docs/Gradea_Build_Plan.md` (read-only copy, unchanged), Phase 0 and Phase 1.
Checked on 16 November 2026 against `origin/staging` at `9df8723`, `origin/main` at `a408c8f`, and the live site.
Each task is named by the start of its line in the Build Plan; the wording there is not changed.

Markers: ✅ done (on `origin/staging` and works) · 🟡 partly done (note says what is missing) · ⬜ not started · ⏸ moved or paused · (other repo) belongs to `gradea-backend`, status left to that repo.

Status counts include only this repo's tasks. Tasks marked (other repo) or ⏸ are not counted.

---

## Phase 0 — Coming-soon page

Status: 4 of 7 tasks done.

- ✅ **Repositories** (frontend side). `main` and `staging` exist, work reaches them only through pull requests, and the repo has `AGENTS.md`, `CLAUDE.md`, `.claude/rules/`, `.claude/skills/`, the read-only `docs/` copies, design PNGs and screen notes. The backend side is (other repo).
- ✅ **CI/CD** (frontend side). `.github/workflows/ci.yml` runs type check, lint, token check and audit, and tests on every pull request and push. The `sync-deploy-repo` job pushes `staging` and `main` to the deploy repo only after the checks pass. The production site serves the latest `main` (social links from PR #18), so the sync and Vercel deploy work. The backend Action is (other repo).
- ⬜ **Shared file.** No copy of the backend's generated file is in this repo yet. The event list lives in `lib/analytics.ts` until it exists.
- ✅ **Frontend setup.** `app/fonts.ts` loads Lora 700 and Inter 400, 500, 600 and 700 with `latin-ext`. `styles/tokens.css` is imported once in `app/layout.tsx`. The token check and audit run in `npm run check`. `lib/content.ts` loads the content files with types inferred from the JSON.
- (other repo) **Backend (`gradea-backend`).**
- ✅ **The coming-soon page.** `app/page.tsx` with `content/marketing/coming-soon.json`: logo, tag, headline, one line, "Follow us for updates.", four linked social icons. No form and no API call (tested in `tests/coming-soon-page.test.ts`).
- 🟡 **PostHog.** The page view and the privacy limits are in `lib/analytics.ts`, and the production build has a PostHog key. Missing: the event list is local, not from the shared generated file. Also not checked from the repo: that PostHog receives the page views, and that "Discard client IP data" is on in the PostHog project.
- 🟡 **Deploy.** Production works: `https://usegradea.com` redirects to `www.usegradea.com` and serves the page from `main`. Missing or not checkable from the repo: the Vercel staging preview (the `staging.usegradea.com` name does not resolve; Build Plan only requires a preview).

**Done when:**

- ✅ A visitor can open usegradea.com and see the coming-soon page with the social icons, each a real link once its account exists. Checked: HTTP 200, title "Gradea, coming soon", links to LinkedIn, TikTok, YouTube and X.
- ✅ The page is live in production.
- 🟡 PostHog records page views. The production build contains the key; that events arrive must be checked in PostHog.

---

## Phase 1 — Foundation

Status: 2 of 5 tasks done.

- ✅ **Repository setup** (frontend side). ESLint and Prettier with exact versions, `.env.example` with the PostHog settings. The Action in `gradea-backend` that opens pull requests here is (other repo).
- ⏸ **API on our own domain.** Moved to Phase 10. Nothing in this repo reads an API address now.
- (other repo) **Database.**
- (other repo) **Auth (in `gradea-backend`).** The frontend screens for it (A4 Sign up / Log in, A5 Forgot password, A6 Account link) are not started; their designs are in `docs/design/phase-1/`.
- (other repo) **`lib/ai/` abstraction skeleton.**
- ⏸ **Deployment pipeline.** Moved to Phase 10.
- ⬜ **Error tracking** (frontend side). No Sentry or equivalent in `package.json` or the code.
- ✅ **Frontend fonts and tokens.** Same evidence as Phase 0 "Frontend setup", including `--font-lora` and `--font-inter`.
- 🟡 **Usage analytics.** One send function (`track`) and one event list with allowed properties, and the PRD Section 19 privacy limits. Missing: the list does not come from the shared generated file yet, and no Phase 1 events exist because no Phase 1 screen is built.
- 🟡 **Content files.** `content/app`, `content/marketing`, `content/emails` and `content/shared` exist, and the loader fails the type check on a missing or misspelled key. Missing: the content files for A4, A5 and A6.

**Done when:**

- ⬜ A developer can sign up and log in via email/password or Google. The frontend screens (A4, A5, A6) are not started; the backend auth is (other repo).
- (other repo) The database stores a user with the defaults (subscription_status free, region nigeria; career_level required at signup).
