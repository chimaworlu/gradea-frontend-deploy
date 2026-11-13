# Coding standards

Always apply. Product decisions live in the PRD, SRS and Build Plan. If this file and those disagree on product behaviour, they win. If they disagree on how to code, this file wins. Flag the conflict, do not hide it.

## 1. Repos
- Frontend work stays in `gradea-frontend`. Backend work stays in `gradea-backend`.
- Frontend: screens, components, `content/` JSON, tokens. Backend: endpoints, database, `lib/ai/`, payments, webhooks, auth, scheduled jobs.
- A feature that needs both is built backend first (the endpoint), then frontend (the screen).
- The frontend never imports backend code, never touches the database, and never calls an AI provider.

## 2. TypeScript
- Strict mode stays on. No `any`, no `@ts-ignore` and no `as` casts to silence an error. Fix the type.
- Anything that crosses a boundary (API request, API response, AI output, webhook payload, file contents) is validated with a Zod schema before it is used.
- Names follow the SRS data model exactly. If the SRS says `career_level`, the code says `career_level` or its direct camelCase form, never a renamed variant.

## 3. Errors
- Never swallow an error. No empty `catch`, and no `catch` that returns fake or default data.
- Every failure either retries as the SRS says or surfaces a typed error. Never show partial or guessed content.
- Users see a clear, actionable message. Never a stack trace or a raw error string.

## 4. Logging
- Log structured metadata only: which function, which provider, timing, success or failure.
- Never log CV text, job description text, extracted content, emails or payment details. Not in console logs, not in Sentry, not "temporarily".

## 5. Secrets and config
- All secrets come from environment variables. Never hardcode them and never commit them.
- Values the SRS says will be tuned (timeouts, fair-use limits, plan prices) live in one named config place. Never repeat them inline.

## 6. Text
- All user-facing text lives in the JSON content files. No sentences hardcoded in components or in backend responses that reach the user.

## 7. Comments
- Where code enforces a PRD or SRS rule that is not obvious from the code, add one short comment naming the section (for example, why a usage counter only increments after validation).

## 8. Stack
- Do not add a library or change the stack without updating the SRS first. A second AI SDK is never allowed (see ai-pipeline).

## Done means
- A feature that works but breaks a rule above has failed.
- Type checks, lint and the tests for the code you touched pass before you report done.