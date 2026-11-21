# F1 Dashboard: dev notes

Figma: "F1 / Dashboard / Free", "F1 / Dashboard / PRO", "F1 / Dashboard / New user" (Desktop WEB, 1440 wide). Desktop done. Phone pending.

## How users get here
- More menu (Dashboard) and avatar menu (Dashboard).
- Login with no scan in progress lands here.

## Layout
- App top bar with a small primary "Scan a CV" button (36px) before the avatar.
- Content column 1040 wide, centered, 48px top padding. Headline "Welcome back" (Lora Bold 40/47).
- Row 1: three equal cards. Row 2: Recent scans (672) and Career level (352). Free and New user: locked PRO preview band at the bottom (#EEF2F7).

## Free
- Latest score: 72px ring with the score, amber below 75, green from 75. Line "+6 points since your last scan" (hide when there is only one scan).
- Scans left this month: General "3 of 5 left", Job-specific "1 of 1 left".
- AutoFix trial: "Not used yet. Pick one flagged line and we'll rewrite it." After use, show the used state.
- Recent scans: date, type, score. No chevrons and no click. This is a score log only. Note: "Upgrade to open past results." with a Get PRO link.
- Career level: value, "Your scores are calibrated to this.", Edit link.
- PRO preview band: lock icon, "With PRO" line, Get PRO button.
- Nearly out of scans (text only, no new frame): when 1 or 0 scans are left, show a short line under that row, e.g. "Resets on <date>" plus a Get PRO link. Never red.

## PRO
- Card 2 "Your plan": plan name, "Renews on <date>" (or "Ends on <date>" if renewal is off).
- Card 3 "Usage": "Unlimited scans", "A fair-use limit applies."
- Recent scan rows have chevrons and open the past result (Historical Review).
- No upgrade note, no PRO preview band.

## New user (no scans)
- Not a landing page after signup (signup goes to the upload page). It shows whenever a signed-in user with zero scans opens the Dashboard, for example after logging in again.
- Empty-state card: "No scans yet", "Upload your CV and get your first grade in seconds.", Scan my CV button.
- Then Scans left (5 of 5, 1 of 1), AutoFix trial, and the PRO preview band. No latest score, recent scans or career cards until the first scan.

## Data
- Latest score, delta, last 3 scans: from scan records. Counts reset monthly.
- Never send locked data to the browser for Free users.