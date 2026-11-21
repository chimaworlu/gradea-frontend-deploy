# A4 Sign up / Log in: dev notes

Figma: "A4 / Sign up / Log in / Sign up", "Log in", "Log in error" (Desktop WEB, 1440 wide). Desktop done. Phone pending.

## What it is
- The direct door for people who click "Log in" without uploading a CV first ("Get started" opens the upload page, A1, instead; changed 19 Nov). Someone who wants an account first reaches the sign-up mode from the "Create an account" link on the Log in mode. One page with two modes. It uses the same form block as the A3 signup wall, so the two stay identical.
- Top bar shows only the wordmark (user is logged out). Form is 480 wide and centered across. Vertically it sits slightly above the true middle (optical centre: the area under the top bar is centered with 96px extra space at the bottom). If a form is ever taller than the screen, give it a fixed top gap of 64px instead. The same rule applies to A5 and A6 so the flow does not jump.
- Spacing in the form: heading and subline 8px, subline to Google button 24px, Google button, "or" and first field 16px, between fields 16px, field to button 16 to 24px, button to the lines under it 16px. A3 should be brought to the same spacing when it is revisited.

## Sign up mode
- "Create your account", "It takes a few seconds." Google button, email, password, career level, consent line, "Create account" button, "Already have an account? Log in".
- Same invisible checks and the same messages as A3 (throwaway domain, domain cannot receive mail, bot check). Button shows "Creating your account..." while they run. Never "Verifying". See A3 notes for error texts and the password rule.
- After signup the user lands on the upload page as a signed-in Free user (changed 19 Nov), so they can scan right away.

## Log in mode
- "Log in", "Welcome back." Google button, email, password with a "Forgot password?" link on the right (opens A5), "Log in" button, "New here? Create an account".
- No career level and no consent line (those are only for new accounts).
- Wrong email or password: one plain red line above the button, "Email or password is wrong." Never say which one was wrong, so nobody can probe for accounts. The form stays filled in, password cleared.
- After a successful login with no scan in progress, land on the Dashboard. With a scan in progress, return to it.
- Signing in with Google for an email that already has a password account opens A6 (account link confirm).
- Rate limit repeated failed logins quietly. No lockout wording on screen.