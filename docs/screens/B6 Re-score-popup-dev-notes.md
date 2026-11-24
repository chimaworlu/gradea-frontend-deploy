# B6 Re-score popup, developer notes

- Opens from the Re-score button in the results top bar. Available to every signed-in user.
- Shows the current score, the A1 upload box, career level with "Change" (applies to this scan only; the default is changed on Profile), and scans left this month (Free only; PRO sees no line).
- Job-specific mode adds the job description box (entered fresh for each new scan). Frame 2.
- Scan button stays off until a valid file is chosen. Same file rules as A1 (PDF or DOCX, 2MB).
- Free user with 0 scans left sees the A1 limit popup instead of this one.
- PRO only: a choice "Upload a new file" or "Re-score my working copy" (no upload; scores the CV with approved AutoFix changes; counts as a scan). Designed later with the PRO states.
- Cancel, X, Esc or a click outside closes it.

## Frame 2: Job-specific
- Adds the job description block (paste text or from a link, same component and checks as A1). The text is stored with the new scan, not reused from the old one.
- Score chip names the score being compared: "Current score: 74 (General)".
- Scans line: "1 of 1 Job-specific scan left this month." Scan button stays disabled until a valid file and a valid job description are present, with the note "Add a job description to continue".

## Mode switch inside the popup
- The popup has its own General / Job-specific switch, same component as A1. It opens on the mode the results page is in.
- Flipping it inside the popup shows or hides the job description box and swaps the scans line. The top bar switch follows, so the page and the popup never disagree.
- Cancel closes the popup and restores the page mode it opened with.