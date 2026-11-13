---
name: start-build-phase
description: Use when the founder says start, continue, finish, or check a phase, or asks what to build next. Trigger words - phase, build plan, next, start Phase, continue, what is left, done when, designs needed.
---

# Start a build phase

Takes one phase of the Build Plan from "not started" to "done when passes". Laws: AGENTS.md Sections 1 and 8, the Designs rule in the Build Plan Overview, `testing.md`, `git-conventions.md`.

The PRD, SRS and Build Plan in docs/ are read-only copies. If one needs a change, tell the founder; it is changed in gradea-backend first.

## Steps
1. Open the Build Plan in `docs/`. Find the phase. Read its list and its "Done when" line.
2. Read the "Designs needed" line. For each screen ID, check that `docs/design/` has a PNG for every state, and that `docs/screens/` has its dev notes.
3. Read the PRD and SRS sections the phase names. Check its dependencies (for example, Phase 7 needs the business registration for Flutterwave).
4. If a design, a note or a dependency is missing, stop and ask. List exactly what is missing. Do not guess a screen.
5. Split the phase into tasks. Order them: database, then backend (endpoints, jobs, `lib/ai/`), then frontend screens, then emails. A feature that needs both is backend first.
6. For each task, load its skill: `change-database`, `add-api-endpoint`, `change-ai-task`, `add-scheduled-job`, `build-screen`, `build-marketing-page`, `build-email`.
7. Do one task at a time. After each, run type check, lint, the token audit and the task's tests.
8. When every list item is done, run the flow described in "Done when" on staging or a preview.
9. Report what is done, what is blocked, and which designs and notes you used.

## Skeleton
```markdown
## Phase N status
- Designs present: A1 (3/3 states), B3 (4/5 states, missing B3-error.png)
- Dependencies: ok / blocked by ...
- Tasks: [x] change-database  [x] add-api-endpoint  [ ] build-screen
- Done when: checked on staging, result ...
```

## Traps
- Building a screen from memory when its PNG is missing.
- Doing the frontend first and calling an endpoint that does not exist yet.
- Starting a phase whose dependency is not met.
- Pulling work from a later phase because it looks easy.
- Fixing an open PRD or SRS question quietly. Flag it (AGENTS.md Section 8).
- Reporting "done" without running the "Done when" flow.

## Verify before done
- [ ] Every list item of the phase is built or reported as blocked.
- [ ] "Done when" was run, not assumed.
- [ ] Type check, lint and the audit pass.
- [ ] No locked behaviour changed without a PRD or SRS update.
- [ ] Tests: confirm each test that `testing.md` requires for the phase exists, and write any that are missing.