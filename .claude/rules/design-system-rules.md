---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.css"
---
# Design system rules

Source of truth: `styles/tokens.css`, generated from `gradea-design-tokens.json`. Never edit tokens.css by hand. To change a value, change the JSON and regenerate: `node scripts/build-design-tokens.mjs`.

## 1. Tokens only
- Use `--color-*` roles for every colour. Never use `--primitive-*` in a component.
- No raw hex, rgb or hsl in components or CSS modules. Exceptions: `currentColor`, and the logo and icon SVG files.
- No raw px for spacing, radius, font size or shadow. Use `--space-*`, `--radius-*`, `--font-*`, `--shadow-floating`.
- In React style objects, never use a bare number for spacing, size or radius (for example `padding: 16`). Use the CSS variable, for example `padding: "var(--space-16)"`. The audit cannot catch this, so the reviewer must.
- Spacing uses only the scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. Use 4 only for an icon and its label.
- If a design needs a value that has no token, stop and ask. Do not invent one.
- The audit must pass before a task is done: `node scripts/build-design-tokens.mjs --audit`.

## 2. Colour meaning
- Navy is the only accent: headings, primary buttons, links.
- Green means strong or passed. Amber means flagged or missing. Never use either as decoration.
- Red is for real errors only (failed payment, unreadable file, form error, delete). Never use red for a flagged line.
- Locked or PRO-only items use the neutral grey-blue with a lock icon. Never amber or green.
- One accent dominates each screen. Everything else is navy, ink or neutral.
- Text on a tint uses its `on-` role. Amber text on amber tints uses `--color-on-warning-container`. Green text on tints uses `--color-on-success-container`. No white text on amber. No purple, indigo or violet anywhere.
- Never use colour alone to carry meaning. Pair it with an icon or a word.

## 3. Typography
- Lora for big moments only: hero headline, section titles, the score number. Inter for everything else.
- Prices, counts and tables are always Inter with `font-variant-numeric: tabular-nums`. Lora has no naira sign.
- Use the `--font-*` shorthand and set its `letter-spacing` token too.
- Minimum text size is 12px. Phone inputs are 16px or larger.
- Do not make up sizes. Display and headline sizes switch on phones through the tokens, with no extra code.

## 4. Layout
- Marketing content column is `--layout-max-width-marketing` (1120), centered. App pages use `--layout-max-width-app`. Text pages (About, Privacy, Terms) use `--layout-max-width-text`.
- Marketing sections: `--space-48` padding top and bottom. Use `--space-section-marketing` for the gap between sections.
- Use `--space-card-padding` and `--space-page-gutter` so phone values switch by themselves.
- Phones: every button and tappable icon is at least `--size-touch-target` (44).
- Breakpoints: phone under 640, tablet 640 to 1023, desktop 1024 and up. Phone and tablet layouts are built from the desktop design and these tokens.

## 5. Shape and depth
- Radius: 6 for tags and chips, 8 for buttons, inputs and cards, 10 for popups, modals and the CV page. Round only for the score ring and avatars. Never 0, never above 10, no pill shapes.
- Shadow only on floating layers (popovers, dropdowns, modals, toasts), using `--shadow-floating`. Cards, panels and buttons are flat.
- App cards use the 1px `--color-border-card` line. Money, account and marketing cards have no outline.
- Inputs, selected states and dashed upload zones always keep their outline. Selected cards use the 2px navy outline.

## 6. Components
- Buttons are 44 tall in the app and 48 on marketing pages. Small (36) is desktop only, in the top bar and inside cards.
- One primary button per section. Secondary is white with the input outline and navy text.
- Destructive red is used only on the final delete confirm.
- Inputs are 48 tall with the `--color-border-input` outline. Labels above the field. Error text and a red outline below it.
- FAQ lists are dropdowns. First item open, the rest closed, chevron down when closed and up when open.
- Icons are Lucide, 1.5px stroke, `--size-icon`. Social icons live in the footer only.
- Use the existing logo component. Never redraw it.

## 7. States and motion
- Every interactive element has hover, pressed, keyboard focus and disabled states. Focus is a 2px navy ring with a 2px gap.
- Motion is fade and slide only, using `--duration-*` and `--easing-standard`. No bounce, wiggle or pulse.
- Allowed only in: the hero scan demo, the How it works reveal (once), the score count-up, the CV highlight when a category opens, and the green check on approve.
- Respect reduced motion in CSS and in JS (`matchMedia("(prefers-reduced-motion: reduce)")`).
- Video never autoplays. It plays on click.

## 8. Done means
- A screen that looks right but uses a raw hex, raw px or a primitive colour has failed.
- A colour used outside its meaning has failed, even if it looks good.
- Compare the built screen with the Figma design at desktop and phone widths before reporting it done.