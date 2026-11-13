# Testing

Always apply. Tests exist to protect the things Gradea promises: no fabrication, correct money, correct limits, data gone when it should be.

## 1. Tests that must exist
Write these when you build the feature, not later. A feature in this list without its test is not done.

- **No fabrication:** `autoFixLine` and `magicWrite` given a case where a plausible but unsupported fact could slip in. `validateOutput` must reject it, and the draft is never shown.
- **Limits:** exactly the 5th General scan, exactly the 1st Smart Target scan, the scan after the limit (rejected before any AI call), and a failed AI call (the counter must not change).
- **AutoFix trial:** used only when a validated draft is shown. A failed call or a rejected draft does not spend it.
- **Webhooks:** a valid payload grants access once. A repeated payload grants nothing more. An unsigned, malformed or unknown-transaction payload changes nothing.
- **Money:** upgrade credit, the launch offer cap (two payments at once cannot pass 20), the first-payment-only commission, no commission on renewals, self-referral rejected.
- **Renewal:** only card payments on Monthly and 3-Month auto-renew. Transfer and USSD do not. A failed renewal does not change access early.
- **Ownership:** every authenticated endpoint rejects a user who does not own the resource.
- **Tier gating:** a Free response contains no locked line detail.
- **Files:** a wrong type, an oversized file and a non-English file are rejected on the server. The original file is not left anywhere after extraction, including after a failure.
- **Retention:** the 12-month deletion, the 30-minute guest expiry, the Day Pass 24-hour expiry and the 24-hour grace use simulated time. Never wait for real time.
- **Account deletion** removes CV content, job descriptions and results.

## 2. Real samples
- A new AI provider or a model change is checked against real CV samples before merging. Mocked answers do not prove fabrication is avoided.
- Both DeepSeek and GPT pass the same tests behind the same function.

## 3. Behaviour
- A bug that was fixed gets a test that fails without the fix.
- Tests never use real user data or real payment keys.
- Do not delete, skip or weaken a test to make a task pass. If a test seems wrong, say so and ask.

## Done means
- A feature in the list above with no test has failed.
- A skipped or loosened test to get green has failed.
- Type checks, lint and the tests for the code you touched pass before you report done.