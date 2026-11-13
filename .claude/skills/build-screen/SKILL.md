---
name: build-screen
description: Use when building an app screen, popup, or state in gradea-frontend from a Figma design. Trigger words - screen, component, popup, state, results, dashboard, billing, profile, upload, styling, layout, tokens, phone layout.
---

# Build an app screen

Turns one design into a working screen. Laws: `design-system-rules.md`, `content-and-copy.md`, `api-contract.md`, `analytics.md`.

## Steps
1. Find the screen ID in the screen list. Confirm the PNG of every state in `docs/design/` and the dev notes in `docs/screens/`. If any is missing, stop and ask.
2. Read the dev notes completely. They hold the behaviour, states and animations.
3. Create or open the content file in `content/app/`. Use the file structure from `content-and-copy.md`: `id`, `title`, sections in design order, states beside the text, placeholders for changing values.
4. Regenerate the content types and run the build, so a missing key fails now.
5. Build the layout with tokens only: `--color-*` roles, `--space-*`, `--radius-*`, `--font-*` shorthands.
6. Build every state the PNGs show: empty, loading, error, filled.
7. Check the phone layout. The tokens switch sizes under 640. Buttons stay 44 tall, inputs 16px or larger. Follow the dev notes where the phone layout differs.
8. Add hover, pressed, keyboard focus and disabled states. Respect reduced motion.
9. Add the analytics events: add each name to the shared list, then send it through the one send function.
10. Call the backend through the generated client types. Show locked content only from what the server returned.
11. Run the token audit, type check and lint. Compare the build with the PNGs at desktop and phone width.

## Skeleton
```json
{ "id": "A1", "title": "Upload",
  "uploadBox": { "default": { "instruction": "Drag your CV here" },
                 "error": { "tooLarge": "That file is over 2MB. Try a smaller PDF or DOCX." } } }
```
```tsx
import styles from "./UploadBox.module.css";
import { getContent } from "@/content";

export function UploadBox({ state }: { state: "default" | "error" }) {
  const t = getContent("app/upload").uploadBox;
  return <div className={styles.box}>{state === "error" ? t.error.tooLarge : t.default.instruction}</div>;
}
```
```css
.box { padding: var(--space-card-padding); border-radius: var(--radius-md);
       border: var(--border-width) dashed var(--color-border-input); }
```

## Traps
- A raw hex or px value, or a bare number in a React style object.
- A sentence typed into a component.
- An outline on a money, account or marketing card.
- Red on a flagged line, or amber or green on a locked item.
- Lora on a price. Prices are Inter with tabular numbers.
- Sending locked data to the browser and hiding it with CSS.
- Two primary buttons in one section.
- A recording or event that can carry CV text.

## Verify before done
- [ ] The audit passes and no raw values were added.
- [ ] Every PNG state exists in the build.
- [ ] No hardcoded text and no price or date written inside a sentence.
- [ ] Focus, hover, disabled and reduced motion work.
- [ ] Tests: each state renders from the content file; a Free response renders no locked detail; an accessibility check passes at a phone width; each analytics event fires once with only allowed properties.