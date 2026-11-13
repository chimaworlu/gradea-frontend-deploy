---
paths:
  - "content/**"
  - "**/*.tsx"
---

# Content and copy

Voice and word rules come from `gradea-design-tokens.json` ("voice and copy").

## 1. Where text lives
- All user-facing text lives in the JSON content files, never in components, never in backend responses that reach the user. Folders: `content/app/`, `content/marketing/`, `content/emails/`, `content/shared/`.
- One file per screen (for example `content/app/upload.json`). Text used on many screens goes in `content/shared/`.
- Every file starts with `id` and `title` that match the screen list (for example `"id": "A1", "title": "Upload"`).
- Inside a file, sections follow the design from top to bottom and use the Figma section names. Each section holds its own states (empty, loading, error) next to the normal text.
- Changing values use placeholders such as `{price}`, `{date}`, `{count}`. Never build a sentence by joining strings in code.
- Privacy and Terms stay as plain text or Markdown files.
- A missing or misspelled key must fail at build time through the generated types.

## 2. Words
- British English (organise, colour). Sentence case everywhere except product names. "CV" in the product. Marketing page titles and search text also include "resume".
- No em dashes and no emojis in product text. Short sentences. Plain words ("Fix this line", not "Optimise your bullet").
- Buttons are a verb plus an object: "Scan my CV", "Get PRO". Never "Submit" or "Continue".
- Fixed names, always written this way: AutoFix, Magic Write, PRO, Free, Day Pass, Re-score, working copy. A flagged line is "flagged", a good one is "strong". Never "bad" or "errors".
- Explain "ATS" once where it first appears: "the software employers use to filter CVs".

## 3. Trust
- Errors say what happened, why, and what to do next. Never "Oops!" and never blame the user.
- Money is plain and matches the real rules: "Renews on 1 Dec at ₦4,000. Cancel anytime." Dates look like 22 Oct 2026. Prices look like ₦4,000 and $9.99.
- No fake urgency or scarcity. A counter, an offer or "spots left" appears only when it is true and read from the server.
- No big promises ("Get hired fast"). Say what the product does. Never write "guaranteed".
- AI output is a draft. Say: "We only use facts from your CV or what you tell us."

## Done means
- A sentence hardcoded in a component has failed.
- A price, date or number written in the text instead of a placeholder has failed.
- An offer or counter shown when it is not true has failed.