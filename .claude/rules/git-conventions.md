# Git conventions

Always apply.

## 1. Commits
- Small commits, one change each. A message says what changed and why, and names the PRD, SRS or Build Plan section when it implements or changes a locked requirement (for example "Enforce Free scan limit, PRD FR-9").
- Never commit secrets, `.env` files, real user data or real payment keys. If one is committed by mistake, treat it as leaked: rotate it first, then remove it.
- Never rewrite or force-push shared history.

## 2. Branches and pull requests
- Work on a branch. Never push straight to `main`.
- These need explicit review, never a quick self-merge: anything in `lib/ai/` or `validateOutput()`, usage limits, billing, webhooks, affiliate money, auth, uploads and retention.
- A pull request that changes locked product behaviour updates the PRD or SRS in the same change. Code and documents must not drift apart.
- A change to `gradea-frontend` and a change to `gradea-backend` that depend on each other are in the same pull request, or backend first, so the frontend never calls an endpoint that does not exist yet.

## 3. Before production
- Check every change on a preview or staging deployment first, especially the scan flow, billing and AI.
- Database migrations run on staging before production (see database-schema).

## Done means
- A secret in a commit has failed, even if it was removed in the next commit.
- A change to a locked decision with no PRD or SRS update has failed.
- A billing, AI, auth or upload change merged without review has failed.