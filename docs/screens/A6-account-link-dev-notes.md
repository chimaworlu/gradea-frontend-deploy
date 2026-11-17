# A6 Account link confirm: dev notes

Figma: "A6 / Account link / Default", "Wrong password", "Linking" (Desktop WEB, 1440 wide). Desktop done. Phone pending.
Same page frame, form pieces, spacing and vertical position as A4 and A5.

## When it shows
- The user taps "Continue with Google" (on A3 or A4) and the Google email already belongs to a password account. We never link silently, because anyone who controls a Google address could take over an account that way. They must prove the account is theirs with the existing password.

## Screen
- "Link your Google account", "<email> already has a Gradea account. Enter your password once to link it with Google." The email is shown so the user knows which account it is.
- Password field (eye toggle), "Forgot password?" link on the right (opens A5), "Link accounts" button, "Cancel" link.

## States
- Default.
- Wrong password: red line above the button, "That password is wrong." It is fine to say this here, because the user already knows the account exists. The field keeps its value cleared and focused. Rate limit repeated attempts quietly.
- Linking: button shows a white spinner and "Linking..." and cannot be tapped again. The field and the Forgot password link drop to 40% and cannot be changed.

## Rules
- Right password: store the Google identity on the existing account, log the user in, and send them where they were headed (Dashboard, or the scan they started). The account and all its data stay the same. From then on the user can sign in with Google or with the password.
- Cancel returns to the log in page. No link is made and nothing is stored.
- If the user taps "Forgot password?", the link is not made. After they reset the password they sign in with Google again and land back here.
- Send a short "Google sign-in was linked to your account" email after linking.
- Google users who have no password account never see this screen.