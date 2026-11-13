---
paths:
  - "**/billing/**"
  - "**/pricing/**"
  - "**/checkout/**"
  - "**/affiliate/**"
---

# Money and billing

Flows are SRS Sections 7 and 9 and PRD Sections 16 and 25. Provider: Flutterwave, one gateway for NGN and USD.

## 1. The server owns the money
- Prices, amounts, credits, discounts, plan lengths and commissions are computed on the server from config. Never read one from the browser.
- Prices, fair-use numbers and the launch cap live in one config place. Never repeat them inline.
- Never store card details. Keep only the transaction reference and the provider's authorization token.

## 2. Access changes only from a verified webhook
- A user becomes PRO only when the webhook is verified and the payment succeeded. A redirect, a client call or a polling response never grants access.
- Verify the webhook signature first. A bad signature, or an unknown transaction, changes nothing and is logged.
- Webhook handling is idempotent, keyed by the provider transaction reference. A repeated webhook or a double tap never grants time twice.
- A failed or abandoned checkout changes nothing.

## 3. Plans and renewal
- Day Pass is 24 hours. Weekly, Monthly and 3-Month are 7, 30 and 90 days.
- Every plan can be paid by card, bank transfer or USSD in naira, or by card in dollars.
- Only Monthly and 3-Month, and only when paid by card, auto-renew. Day Pass, Weekly and any transfer or USSD payment never auto-renew and get the reminder email and a Renew button.
- Failed renewal: retry twice over 3 days with an email each time. If it still fails, let the plan expire. A failed renewal never changes access before `subscription_expires_at`.
- When a plan ends: `grace` for 24 hours (view and download only, no AI actions, no Re-score), then `free`. Saved PRO sessions are kept 12 months, locked while free, restored on repurchase.
- There is no refund flow and no refund-triggered access removal. Purchases are non-refundable.

## 4. Plan changes
- Upgrade credit = (days left / days in cycle) x the price actually paid for the current cycle. It is a discount, never a refund. The new cycle starts at once.
- Get quotes from the server quote endpoint. Never compute them in the frontend.

## 5. Limits
- Free: 5 General and 1 Smart Target scan a calendar month. Check before any AI call, and reject before any AI cost is incurred.
- A counter changes only on success. A failed AI call never uses a scan, an AutoFix trial or a fair-use action.
- PRO fair use (20 scans and 40 AutoFix or Magic Write actions a day, rolling 24 hours) is read from config. At 80 percent, log a quiet alert. Never show it to the user.
- The AutoFix trial is spent only when a validated draft is shown.

## 6. Launch offer
- 50 percent off the first cycle for the first 20 Monthly or 3-Month subscribers. Count redemptions atomically on successful payment, so two payments at once cannot go past 20.
- After 20, the plans endpoint stops returning the offer fields.

## 7. Affiliate money
- Attribution is applied at sign-up on the server. A commission is created only inside the billing webhook handler.
- Commission is 20 percent of the amount actually received (after any discount), for the referred user's first successful payment only, once. No commission on renewals, no signup bonus.
- A commission becomes payable 30 days after the payment. It is cancelled on a reversal or a billing error.
- Self-referrals and users who already had an account are rejected.
- The programme is Nigeria only for now, payouts are in naira only, and the minimum payout is 1,000 naira. Payouts are paid by hand and approved in the admin dashboard, and every approval writes an audit log row.

## Done means
- A flow that grants PRO from anything other than a verified webhook has failed.
- A webhook that can grant time twice has failed.
- A commission that can be created twice, or on a renewal, has failed.
- A failed AI call that used up a scan has failed.