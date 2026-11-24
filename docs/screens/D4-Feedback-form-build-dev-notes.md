# D4 Feedback form: build notes

Figma (Desktop WEB): "D4 / Feedback / Empty", "D4 / Feedback / Filled", "D4 / Feedback / Thanks". Desktop done. Phone pending.

## How users get here
- More menu > Feedback, on any signed-in screen. Popup 480 wide, 32px padding, radius 10, 40% ink scrim, one soft shadow.

## Form
- Title "Send us feedback", line "Tell us what's working, what's not, or what you'd like to see."
- One required field: the message (4 lines, 416 wide, 1px #677B98 outline, radius 8, placeholder "Write your message here"). Limit about 2,000 characters.
- "Reply to <account email>" is read only, filled from the account, with "We'll only use your email to reply."
- Cancel link and primary "Send feedback". The button is faded and cannot be tapped until the message has text.
- Send with the message, user id, plan, the screen the user was on, and the time. Never attach CV text, results or job description text.

## States
- Empty: Send disabled.
- Filled: Send enabled.
- Sending: button shows a white spinner and "Sending...", the message box is locked.
- Failed send (not drawn): red #BC1010 line above the buttons, "We couldn't send that. Your message is still here." The text stays. The button returns to normal.
- Thanks: navy check icon, "Thank you", "We read every message.", full-width Close button. Same popup position, so nothing jumps.

## Where it goes
- Store each message in a Feedback table (id, user id, message, plan, screen, created at) and email it to the support address. Rate limit to a few messages per hour per account. Add it to the admin dashboard later.