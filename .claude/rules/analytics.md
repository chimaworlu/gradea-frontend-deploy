---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Analytics

Gradea uses PostHog to see how people use the site and the app: pages, clicks, screens, features, funnels, searches, and country and city. Rules are PRD Section 19. The Privacy page describes this, and the code must stay true to it.

## 1. One list, one door
- Every event name lives in one shared list in the code. Never type an event name inline.
- Events are sent through one function. No direct PostHog calls scattered through components.
- Use the same names in the frontend and the backend. Names are lowercase with underscores, in the form `object_action` (for example `scan_started`, `plan_selected`, `checkout_paid`).
- Adding an event means adding it to the list first, with its allowed properties.

## 2. Actions, never content
- An event carries the action and a few safe details from an allowed list: which screen, which plan, a score band, a category name, a search word, a source.
- Never put CV text, job description text, extracted content, file names, emails, names, phone numbers, payment details or anything typed into a scan into an event, a property or a user trait.
- Each event has an allowlist of properties. A property that is not on the list is dropped.

## 3. Who and where
- Identify a signed-in user by the internal user id only. Never by email or name.
- Region comes from the visitor's IP as country and city only. Configure the tool so the full IP address is not stored.

## 4. Recordings and autocapture
- No screen recording or session replay on the upload, scan or results screens, or anywhere a CV or job description can appear. Off by default everywhere else, and masked if turned on.
- Autocapture must not read the text of inputs or text areas.

## 5. What to track
- Page views, clicks on key buttons, scan started and finished, upload started and not finished, results viewed, category opened, AutoFix and Magic Write used, plan picker opened, checkout started and paid, sign-up and login, contact and waitlist submissions, FAQ opens, video plays, and search words (for example Job board searches once it ships).
- Track where people drop off in the main flow: upload, scan, results, sign-up, download, upgrade.

## 6. Cookies and consent
- The analytics tool sets its own cookie. It is named on the Privacy page. Do not add any other tracker or cookie without updating the PRD and the Privacy page first.

## Done means
- An event that can carry CV text, job description text or an email has failed.
- A recording on a scan or results screen has failed.
- An event name typed inline, outside the shared list, has failed.