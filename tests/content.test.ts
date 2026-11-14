import { describe, expect, it } from "vitest";
import { fillPlaceholders, getContent, listContentFiles } from "../lib/content";

describe("content loader", () => {
  it("returns the typed text for a registered file", () => {
    const content = getContent("marketing/coming-soon");
    expect(content.id).toBe("G12");
    expect(content.title).toBe("Coming-soon landing page");
    expect(content.hero.headline.length).toBeGreaterThan(0);
    expect(content.hero.subline.length).toBeGreaterThan(0);
  });

  it("rejects a misspelled key or file at type-check time", () => {
    const content = getContent("marketing/coming-soon");
    // @ts-expect-error: proves a misspelled key fails npm run typecheck.
    const misspelled: unknown = content.hero.headlne;
    expect(misspelled).toBeUndefined();
    // @ts-expect-error: proves an unregistered content file fails npm run typecheck.
    expect(() => getContent("marketing/missing").id).toThrow();
  });

  it("gives every registered file a non-empty id and title", () => {
    const files = listContentFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const [key, file] of files) {
      expect(file.id.trim(), key).not.toBe("");
      expect(file.title.trim(), key).not.toBe("");
    }
  });

  it("keeps product text free of em dashes", () => {
    for (const [key, file] of listContentFiles()) {
      const emDash = String.fromCharCode(0x2014);
      expect(JSON.stringify(file), key).not.toContain(emDash);
    }
  });
});

describe("fillPlaceholders", () => {
  it("replaces every placeholder with its value", () => {
    expect(
      fillPlaceholders("Renews on {date} at {price}.", { date: "1 Dec", price: "₦4,000" }),
    ).toBe("Renews on 1 Dec at ₦4,000.");
  });

  it("accepts numbers", () => {
    expect(fillPlaceholders("{count} scans left", { count: 3 })).toBe("3 scans left");
  });

  it("throws when a placeholder has no value", () => {
    expect(() => fillPlaceholders("Renews on {date}.", {})).toThrow(
      "Missing value for placeholder {date}.",
    );
  });

  it("leaves text without placeholders unchanged", () => {
    expect(fillPlaceholders("Scan my CV", {})).toBe("Scan my CV");
  });
});
