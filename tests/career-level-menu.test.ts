import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { menuScrollBehavior } from "../components/scan/CareerLevelMenu";

const ROOT = join(__dirname, "..");
const css = readFileSync(join(ROOT, "components", "scan", "upload.module.css"), "utf8");
const source = readFileSync(join(ROOT, "components", "scan", "CareerLevelMenu.tsx"), "utf8");

/** The body of one CSS rule, for example ".menu". */
function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  return start < 0 ? "" : css.slice(start, css.indexOf("}", start));
}

describe("the per-scan career level menu on A1", () => {
  it("always opens downward, under the Scoring as line, and never flips or scrolls inside", () => {
    const menu = rule(".menu");
    expect(menu).toContain("top: calc(100% + var(--space-4));");
    expect(menu).not.toMatch(/bottom:|max-height|overflow/);
    expect(css).not.toMatch(/\.menu\[data-up/);
    expect(source).not.toMatch(/dataset\.up|maxHeight/);
  });

  it("scrolls the page to show it, smoothly unless reduced motion is on", () => {
    expect(source).toMatch(/scrollIntoView\(\{ block: "nearest"/);
    expect(menuScrollBehavior(false)).toBe("smooth");
    expect(menuScrollBehavior(true)).toBe("auto");
  });
});
