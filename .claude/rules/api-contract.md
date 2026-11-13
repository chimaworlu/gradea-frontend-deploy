---
paths:
  - "**/api/**"
  - "**/lib/api*"
---

# API contract

The frontend and backend talk only through the backend's HTTP API. Endpoints are listed in SRS Section 4.

## 1. One source for data shapes
- The backend's Zod schemas (or the OpenAPI file made from them) are the only definition of request and response shapes.
- The frontend generates its types from them. Never hand-write a shape twice. Never copy a type from the backend into the frontend.
- A change to a shape is done in the same task on both sides. Never merge a backend change that breaks the frontend call.

## 2. The server decides, the client displays
- Plan, scan counts, limits, prices, tier access and commission amounts are computed on the server. The frontend never decides them and never sends them as trusted input.
- Tier gating happens in the response. A Free user's response contains only what Free may see (line detail for one category). Never send locked data and hide it in the UI.
- Referral codes and attribution are applied on the server at sign-up. Never trust a code or an amount sent from the browser.

## 3. Ownership and auth
- Every authenticated endpoint checks that the caller owns the resource. A missing check is a data leak.
- Admin endpoints check the admin role on the server and write an audit log row for every change.
- The JWT is kept by the frontend in an httpOnly cookie. Never store it in localStorage and never put it in a URL.

## 4. Errors
- One error shape everywhere: a stable machine `code`, plus a plain `message` that is safe to show. Never a stack trace, a provider name or raw provider text.
- Use correct HTTP statuses. A scan limit reached, a payment problem and an AI failure each have their own `code`.
- Failed AI calls never consume a free scan (see money-and-billing and ai-pipeline).

## 5. Behaviour
- Webhook and billing endpoints verify the signature first and change nothing if it fails.
- Endpoints that accept files or pasted text enforce the limits from the PRD on the server (file type and size, job description length).
- Anything slow (scans, AutoFix) returns a reference the frontend can poll. Never hold a request open past the timeout in SRS Section 6.

## Done means
- A screen that works only because the frontend hides what the server returned has failed.
- An endpoint without an ownership check has failed, even if it returns the right data.
- A shape that exists in two places has failed.