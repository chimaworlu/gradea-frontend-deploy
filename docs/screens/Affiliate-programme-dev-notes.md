# Affiliate: build notes

Figma page "Affiliate". Frames: G10 landing, I1 Apply (default, link error), I2 status (Pending, Approved, Not approved), I3 dashboard (New, Active), I4 payout request (Form, Filled, Confirmation), I5 Programme terms. Desktop only. Phones are built responsive in code.
Source of truth for rules: PRD Section 25.

## G10 Affiliate landing (public)
- Uses the marketing nav and footer (first version of S1). Footer has 5 columns, one is "Coming soon". No social icons until profiles exist.
- Sections: hero, how it works, what you earn, rules, final CTA.
- "Apply" for a logged-out visitor goes to sign up, then I1. Logged-in goes straight to I1.

## I1 Apply
- Anyone who can introduce Gradea to people who may need it can apply. They do not have to be a Gradea customer, but they need a free Gradea account to get their link and see their earnings. Link error frame shows when the application fails to send.

## I2 Status
- Pending, Approved, Not approved. Not approved can reapply after 30 days. Approval is manual.

## I3 Dashboard
- New affiliate: link/code, copy button, empty stats.
- Active: clicks, signups, paid conversions, commission states (held, payable, paid, cancelled), top-affiliates board (private, monthly, ranked by paid conversions, opt-in display name).
- Commission: 20% of first payment actually received (after discount), one time, no renewals, no signup bonus. Payable 30 days after payment. Cancelled on reversal or billing error.

## I4 Payout request
- Minimum ₦1,000, naira only. The programme is open to people in Nigeria only for now (note on the landing page, dashboard and terms). Bank details are collected only here, stored encrypted.
- TODO: dollar payouts need their own bank fields (decide with Flutterwave transfer options).
- Confirmation frame: manual monthly transfer, approved by founder.

## I5 Programme terms
- 720 wide reading column, 8 numbered sections from PRD 25. Date "Last updated 10 November 2026".
- Contact email in the terms: support@usegradea.com (a mailto link). Legal wording needs review before launch.

## Tracking and privacy
- Own tracking. Attribution 30 days, most recent link wins. Self-referrals and existing accounts excluded.
- Referral code is stored in a non-essential cookie. Disclose in Privacy and respect consent (open question 10).