# Design tokens in CSS

`tokens.css` turns [`gradea-design-tokens.json`](../gradea-design-tokens.json) into CSS custom properties. It is **generated**. Do not edit it by hand.

| File | What it is |
| --- | --- |
| [`gradea-design-tokens.json`](../gradea-design-tokens.json) | The source of truth. Change values here. |
| [`scripts/build-design-tokens.mjs`](../scripts/build-design-tokens.mjs) | The converter. Its header comment documents every rule and decision in detail. |
| [`styles/tokens.css`](tokens.css) | The output. Import it once, globally. |

## Commands

Run these from the repository root. They need Node 20 or newer and have no dependencies.

```bash
node scripts/build-design-tokens.mjs           # regenerate tokens.css
node scripts/build-design-tokens.mjs --check   # CI: fails if tokens.css is stale
node scripts/build-design-tokens.mjs --audit   # CI: fails on values that bypass the tokens
```

`--audit` scans every file in this repo and prints the file, line and value for each of these:

- **Primitive colours:** any `--primitive-*`. Use a `--color-*` role.
- **Raw colours:** hex (`#abc`, `#aabbcc`), `rgb()`, `rgba()`, `hsl()`, `hsla()`. `currentColor` and `transparent` are fine.
- **Raw px** on `font-size`, `padding`, `margin`, `gap`, `border-radius` or `box-shadow`, in CSS or in JS style objects. `0` is fine, and border widths are not checked, so `1px` borders are fine.

It skips `tokens.css`, the generator, logo and icon SVGs (any `.svg` with "logo" or "icon" in its path) and generated files and folders. React numeric style values such as `padding: 16` are not caught, so write them as tokens.

When `package.json` exists, add them as scripts. Run `tokens` before `dev` and `build`, and run both checks in CI:

```json
"tokens": "node scripts/build-design-tokens.mjs",
"tokens:check": "node scripts/build-design-tokens.mjs --check && node scripts/build-design-tokens.mjs --audit"
```

## Colour comes in two tiers. Use only the second.

```
 TIER 1: PRIMITIVES (--primitive-*)        TIER 2: ROLES (--color-*)          COMPONENTS
 raw palette, no meaning                   meaning + contrast built in
 ─────────────────────────────────         ──────────────────────────         ─────────────
 --primitive-key-tertiary   #c7742a  ───▶  --color-warning              ───▶  flag icon
 --primitive-primary-95     #eef2f7  ───▶  --color-primary-soft         ───▶  soft navy tint
 --primitive-warning-30     #7e4a1b  ───▶  --color-on-warning-container ───▶  flagged chip text
```

- **Primitives** (`--primitive-*`) come from `"primitive colors"`: the key colours and the tonal palettes (tone 0 is black, tone 100 is white). They are ingredients. `--primitive-tertiary-40` means "an amber", not "flagged".
- **Roles** (`--color-*`) come from `"color roles"`. Each role points at a primitive and carries a meaning. **Components use roles only.**

Why this matters at Gradea:

1. **Colour is the grading language.** Green only means strong or passed, amber only means flagged, and red only means a real error. Roles carry those meanings. Primitives don't, so using one is how an amber ends up as decoration.
2. **Contrast is already handled in the role pairs.** Amber text fails 4.5:1, so `--color-on-warning-container` points at `warning30`, not at the key amber. Always pair a fill with its `on-` partner:
   ```css
   .chip--flagged {
     background: var(--color-warning-container);
     color: var(--color-on-warning-container);
   }
   ```
3. **Re-theming is cheap.** A future change (dark mode, for example) only re-points roles. Components don't change.

`--audit` enforces this. If no role fits a need, add one to `"color roles"` in the JSON and regenerate. Do not reach for a primitive.

### Every role

| Role | Use it for |
| --- | --- |
| `--color-primary` / `--color-on-primary` | Navy: primary buttons, links, headings / white text on navy |
| `--color-primary-container` / `--color-on-primary-container` | Navy tint: info banners, PRO chip, selected menu rows |
| `--color-primary-soft` | Tags, chips and soft panels (the light navy tint areas). |
| `--color-secondary*`, `--color-success*` | Green: strong, passed, success only (same values; prefer `success` in UI code for clarity) |
| `--color-tertiary*`, `--color-warning*` | Amber: flagged only (same values; prefer `warning`). Never amber text, use `on-warning-container` |
| `--color-error*` | Real errors only: failed payment, unreadable file, form errors |
| `--color-surface` | Page background (Warm Paper) |
| `--color-surface-container-lowest` | White cards on the paper |
| `--color-surface-container*`, `--color-surface-variant` | Subtle fills, from `low` (lightest) to `highest` |
| `--color-on-surface` / `--color-on-surface-variant` | Body text / muted text |
| `--color-inverse-surface` / `--color-inverse-on-surface` | Dark strips (toasts) and their text |
| `--color-border-card` | 1px soft line for app cards and list dividers |
| `--color-border-input` | 1px line for inputs and outlined buttons |
| `--color-primary-hover` / `--color-primary-pressed` | Navy button states |
| `--color-focus-ring` / `--color-focus-ring-on-dark` | Keyboard focus ring (navy, or white on navy) |

## Everything else

| Prefix | Example | Notes |
| --- | --- | --- |
| `--font-<style>-<size>` | `font: var(--font-headline-small)` | A full `font` shorthand. Also set `letter-spacing: var(--font-headline-small-letter-spacing)`, because `font` cannot carry it. Parts: `-family`, `-size`, `-weight`, `-line-height`, `-letter-spacing`. |
| `--font-family-lora`, `--font-family-inter` | | Pick up next/font automatically if it is configured with `variable: '--font-lora'` / `'--font-inter'`. Prices are always Inter. |
| `--space-<px>` | `gap: var(--space-16)` | The spacing scale only: 4, 8, 12, 16, 24, 32, 48, 64, 96. |
| `--space-card-padding`, `--space-page-gutter`, `--space-section-*` | | Responsive. They switch to phone values automatically. |
| `--radius-sm/md/lg/full` | | 6 for tags, 8 for buttons, inputs and cards, 10 for popups and the CV page. `full` is only for the score ring and avatars. |
| `--shadow-floating` | | Popovers, dropdowns, modals and toasts only. Cards stay flat. |
| `--size-*` | `height: var(--size-button)` | Buttons, inputs, touch target, icon. |
| `--layout-*` | `max-width: var(--layout-max-width-app)` | Content widths, results screen columns, nav height. |
| `--duration-*`, `--easing-standard` | `transition: color var(--duration-fast) var(--easing-standard)` | Drop to `0ms` when the user prefers reduced motion. |
| `--gradient-hero`, `--gradient-score-glow` | | The only two gradients. The glow goes only behind a green (75+) ring. |

### Breakpoints

CSS cannot use variables inside `@media`, so write the queries directly. `--breakpoint-*` is there for JavaScript.

```css
@media (width < 640px)  { /* phone */ }
@media (640px <= width < 1024px) { /* tablet */ }
@media (width >= 1024px) { /* desktop */ }
```

## How the JSON maps to CSS (and what is skipped)

- Values written as prose in the JSON (for example `"Card padding: 24 desktop, 16 phone."`) are read with strict patterns. If someone rewords the text, the build **fails** and names the JSON path. It never quietly emits an old value.
- A broken role reference, a bad hex value, or a semantic spacing value that is not on the spacing scale also fails the build.
- Sizes are converted to `rem` (16px root), so text follows the user's browser font size. At the default size they render at exactly the JSON px values. Radii, borders and breakpoints stay in `px`.
- Not converted, because they are rules for people and have no CSS value: voice and copy, notes, locked content, logo, social icons, and the marketing FAQ and form prose.

### Interpretations to confirm

These are not stated as values in the JSON. Each is marked in the script and in the CSS comments:

1. `--color-primary-pressed` uses `primary10`, read from "a little darker than hover".
2. The hero gradient's `rotation: 180` is treated as CSS `180deg` (ink at the top, navy at the bottom).
3. The score glow uses `circle closest-side`, so it fades out at the edge of its box.
4. Three roles stay literal values: `--color-border-card` (`#E3E0D6`) and `--color-warning-container` (`#FEF1E4`), because no primitive matches them, and `--color-surface-container-lowest` (`#FFFFFF`), because white exists in every palette.
5. The JSON gives no value for the "neutral grey-blue" used for locked items or for the modal dim, so they have no tokens yet. Add them to `"color roles"` when they are decided.
