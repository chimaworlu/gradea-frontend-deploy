# Security

Always apply. Data rules are in database-schema and uploads-and-storage. Money rules are in money-and-billing.

## 1. Accounts
- Passwords are hashed with bcrypt or an equivalent. Minimum 8 characters and at least one number. Never store or log a password.
- Never link a Google login to an existing email account silently. The user must enter their existing password once to confirm.
- Sign-up rejects emails on the disposable-email blocklist with the exact message in the SRS.
- Sessions are JWTs kept in an httpOnly cookie. Never in localStorage and never in a URL.

## 2. Access
- Every authenticated endpoint checks the caller owns the resource. No exceptions, and never assume the frontend did it.
- Admin routes check the admin role on the server, write an audit log row for every change, and never show CV content by default.
- Admin pages carry `noindex` and stay out of the sitemap.
- Never trust an id, plan, amount or role sent from the browser.

## 3. Secrets
- Secrets (API keys, database credentials, OAuth secrets, webhook secrets) are environment variables only. Never in code, never committed, never in a log, never in a browser bundle.
- If a secret is committed by mistake, treat it as leaked: rotate it, then remove it.

## 4. Inputs and webhooks
- Validate every input with a schema (see api-contract). Enforce file type, size and text length on the server.
- Webhooks verify their signature first. A bad signature or an unknown transaction changes nothing and is logged.
- Never build a database query by joining strings. Use Prisma.

## 5. Public endpoints
- Sign-up, login, password reset, contact, waitlist and scan endpoints are rate limited. A guest upload cannot be used to run unlimited AI calls.
- The contact and waitlist forms carry the hidden spam check and the rate limit.

## 6. Data in transit and at rest
- HTTPS everywhere. Affiliate payout details are encrypted at rest and readable only by the admin payout screen's server code.
- Never log CV text, job description text, extracted content, emails, payout details or payment data.

## 7. Cookies and trackers
- Only these cookies exist: the login session cookie, the referral cookie (30 days, only for visitors from a referral link), and the analytics tool's cookie. Add no other without updating the PRD and the Privacy page first.

## Done means
- An endpoint that returns the right data without checking who is asking has failed.
- A secret in code, a log or the browser bundle has failed, even once.
- A webhook that changes state on an unsigned request has failed.
- The login cookie is httpOnly, Secure and SameSite=Lax, set for `.usegradea.com`. Staging uses its own domain so the two never share a cookie. CORS allows only the matching site origin, never a wildcard.