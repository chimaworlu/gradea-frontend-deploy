# Admin dashboard: build notes

Figma page "Affiliate & Admin & Marketing web", row under the ADMIN label (y 3120). Desktop only. Only the founder sees it.
Frames: J1 Overview, J2 Users (List, User detail), J3 Billing, J4 Inbox (List, Message), J5 Affiliates (List, Payout request), J6 Abuse and audit log.

## Global rules
- Founder-only route. Check the admin role on the server for every page and every action, not just in the UI. Everyone else gets a 404.
- Never show CV text or job description text. Scores, dates, plans and counts only.
- Top bar: "Gradea Admin", tabs Overview, Users, Billing, Inbox, Affiliates, Abuse, Sign out. Active tab uses the selected tint.
- Cards have no outlines. Inputs, selected chips and secondary buttons keep outlines. Delete is the only red button.
- Every action asks for confirmation and writes a row to the audit log (who, what, target, time). The log is append only.
- Phone layout: built responsive in code. Tables become stacked rows.

## J1 Overview
- Today cards: scans, new users, revenue (₦, Inter), errors, each with a small comparison line.
- "Needs you": inbox messages, payout requests, failed charges in grace, accounts near the daily limit. Each row links to its screen. Hide rows with zero.
- Last 30 days line chart: scans and signups.

## J2 Users
- List: search by email, chips All, Free, PRO, Grace, Paused. Columns: email, plan, scans this month, joined. Paged, 8 per page in design.
- Detail: account (plan, renews, joined, sign-in), usage today against fair use (20 scans, 40 AutoFix or Magic Write, rolling 24 hours, values from config), recent scans (score only), payments.
- Actions: give 24 hours access, pause account, delete account (red). Each confirms first.

## J3 Billing
- Cards: active PRO, in grace, failed charges, ending in 7 days.
- Needs attention: charge failed (retry due), retry 2 of 2 failed, billing error. Retry and Open buttons. Failed charge is retried twice over 3 days.
- Recent payments with Paid, Reversed, Refunded. Reversed or billing error cancels any affiliate commission on that payment.

## J4 Inbox
- Source: D4 feedback form. Types Bug, Feedback, Question. Chips All, New, Done. Unread dot on new ones.
- Message view: full text, plan, where it was sent from, linked scan as score and date only, link to the user.
- "Reply by email" opens a mailto with the user's address. "Mark done" moves it out of New. No in-app chat.

## J5 Affiliates
- List: chips Applications, Payouts, All. Applications show the reason, Approve and Decline. Table shows status, paid conversions, payable now.
- Payout request: amount payable, still on hold, cancelled, minimum met. Commissions listed with Payable or On hold. Bank details shown only here, stored encrypted, decrypted only for this view.
- Flow: send the Flutterwave transfer by hand, then "Mark as paid". Decline asks for a short reason. Payouts below ₦1,000 cannot be requested. Naira only, so the payout detail has no currency field.
- TODO: dollar payouts need their own bank fields.

## J6 Abuse and audit log
- Fair use: accounts at 80% or more of a daily limit. Paused accounts show the restart time. 80% also sends a quiet founder alert; 100% pauses with a banner showing the end time.
- Flagged accounts: many signups from one device, affiliate self-referral signs. Open goes to the user.
- Audit log: date, time, what you did. Read only.
