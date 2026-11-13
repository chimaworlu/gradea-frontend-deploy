# Marketing site: build notes

Figma page "Affiliate & Admin & Marketing web", under the label MARKETING WEB. Desktop only (1440). Phones are built responsive in code. Content column is 1120 wide, centered. Nav padding 160, footer inner 1120.
Frames: S1 shared parts, G1 Homepage (plus Dollars pricing frame), G2 General Analysis, G3 Smart Target, G4 Pricing, G5 Privacy, G6 Terms, G7 Contact (empty, filled, sent, error), G8 About, G9 404, Job board waitlist (empty, filled, joined, error), Coming soon (empty, filled, joined, error). G10 Affiliate landing is in screens/Affiliate/Affiliate-programme-dev-notes.md.

## Shared rules
- Currency switch (Naira / Dollars) changes every price on the page. Default follows location. Prices use Inter (Lora has no naira sign).
- Pricing: Day Pass is the default selected plan on the homepage selector.
- FAQ lists are dropdowns. First item open, the rest closed. Chevron flips when open. Several can be open at once. Answer expands with a short height animation.
- "How it works" is one section: video on top, then the step cards. The video never autoplays, plays on click. The caption under the poster is a placeholder until the video is recorded.
- Every page needs its own title and description. Share image: use the sample result card.
- Social icons appear in the footer only, and only for profiles that are live.

## S1 Nav and footer
- Nav: logo (component "Logo / Lockup"), Product dropdown, Pricing, Earn with Gradea, Log in, primary button. Product opens on hover and click; chevron rotates 180 degrees when open (the design shows the open state with the chevron unrotated). Phone menu is built in code.
- Footer: columns incl. "Coming soon" with only "Job board", which opens the waitlist page. Social icons shown only when profiles exist.

## G1 Homepage
- Hero: upload box with mode switch, sample card with fictional CV. Animations: score count-up, tag pop-in, scroll reveals, hover on category cards.
- Pricing: two cards. Free, and PRO with a plan selector (Day Pass default). Selecting a plan changes price and renew line. Launch offer band below.
- Final call to action sits after the FAQ.

## G2 General Analysis
- Upload box, category score card, sample result (fictional CV), FAQ, link band to Smart Target.

## G3 Smart Target
- Upload plus job description box (100 to 15,000 characters). Match button stays disabled until a CV is added and the description is valid.
- The job description is kept with results for 12 months, like the CV results. Privacy page says the same. Smart Target is 1 free scan a month.

## G4 Pricing
- Four plan cards in a row (no Free card; Free is in the table). Launch offer band with live "spots left" from the server.
- Payment: every plan can be paid by card, bank transfer or USSD in naira, or by card in dollars. Only card payments auto-renew (Monthly, 3-Month). Transfer and USSD plans are one-off, with a reminder email before they end and a Renew button.
- Each plan button goes to sign up first if signed out, then straight to checkout for that plan.

## G5 Privacy and G6 Terms
- Two columns: sticky "On this page" list (active section follows scroll, links jump to sections) and the text. On phones the list becomes a dropdown at the top. "Last updated" is edited by hand.
- Privacy section 6 is "Cookies and usage": it names the login cookie, the referral cookie and the analytics tool cookie (PostHog). Keep it in line with PRD Section 19.
- Plain wording only, no named law. If the payment provider changes, update the services line in Privacy.
- Sign-up must show "By continuing you agree to the Terms and Privacy Policy", both linked.

## G7 Contact
- Topics: Question about my results, Billing or plans, Affiliate programme, Report a problem, Something else. The admin Inbox (J4) uses the same list.
- Send is disabled until all fields are filled. Email validated on blur and on send. Signed-in users get name and email pre-filled. Spam check is a hidden field plus a rate limit.
- Messages from in-app Feedback land in the same Inbox.

## G8 About
- Founder story is a draft for the founder to edit. Photo placeholder to replace (circle). LinkedIn and X icons open the profiles in a new tab.

## G9 404
- Return a real 404 status. Signed-in users see "Go to your dashboard" instead of "Go to homepage". The layout is reused for a general error ("Something went wrong", with Try again).

## Job board waitlist and Coming soon
- Both save to one waitlist table: email, date, source ("job board" or "launch"). One row per email; a repeat sign-up shows the joined state with no duplicate.
- One email only, when it opens, with an unsubscribe link. Privacy section 8 covers it.
- The preview jobs are fictional and labeled. No launch date and no country claim until Nigerian job coverage is checked.
- Coming soon page: keep indexable with a title like "Gradea, coming soon". The full homepage replaces it at launch.

## Logo
- Component "Logo / Lockup": navy mark 28px, lowercase "gradea" Inter Bold 21 navy, gap 10. Social profile pictures use the mark only. Favicon: use a simplified mark (a 16px version may need the notch removed).

## Open items for the founder (not design)
- Buy usegradea.com and set up the support email. The Contact page and Privacy page use support@usegradea.com as a placeholder.
- Record the how-to video. Add the real founder photo and edit the About story.
- Check the AI providers' terms before keeping the "not used to train models" idea on the Privacy page.
- Check Nigerian job coverage before promising anything on the Job board page.
- TikTok icon is not in the coming-soon page yet.
