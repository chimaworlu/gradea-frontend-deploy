# A5 Forgot password: dev notes

Figma: "A5 / Forgot password / Request", "Email sent", "New password", "Link expired", "Success" (Desktop WEB, 1440 wide). Desktop done. Phone pending.
Same page frame, form pieces, spacing and vertical position as A4 (480 wide form, slightly above the middle).

## Steps
1. Request: "Reset your password", "Enter your email and we'll send you a link.", email field, "Send reset link", "Back to log in" link. Opens from "Forgot password?" on the log in form.
2. Email sent: "Check your email", "If there is an account for <email>, we've sent a link to reset your password. It works for 1 hour." Button "Back to log in". "Didn't get it? Send again".
3. New password (opened from the email link): "Choose a new password", "Use at least 8 characters.", New password and Confirm new password (both with the eye toggle), "Update password".
4. Link expired: "This link has expired", "Reset links work for 1 hour and only once. Request a new one.", "Send a new link", "Back to log in".
5. Success: navy check icon, "Password updated", "You can now log in with your new password.", "Log in". The user is NOT logged in automatically.

## Rules
- Step 2 never says whether an account exists. Same wording for a real or a fake email. Never show "no account found".
- Google-only accounts have no password, so no reset email is sent. Step 2 still looks the same. (Optional: send them an email saying they sign in with Google.)
- "Send again" is disabled for 30 seconds after each send and shows a short countdown ("Send again in 24s"). Limit repeated requests per email and per IP quietly.
- The link works for 1 hour and only once. A used or old link shows step 4. A new request makes older links invalid.
- Password rule as in A3: at least 8 characters, no symbol or capital demands. Error "Use at least 8 characters." Mismatch error under the confirm field in red: "Passwords do not match."
- After a successful reset, sign out all other sessions of that user. Send a short "Your password was changed" email.
- Same invisible bot check as signup on the request step. Error styling as in A3 (red line, 1px red outline on the field).