import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getContent, supportEmail, supportMailto } from "../lib/content";

const ROOT = join(__dirname, "..");

/** Every file under the given folders with one of the given extensions. */
function files(folders: string[], extensions: RegExp): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (extensions.test(name)) found.push(path);
    }
  };
  folders.forEach((folder) => walk(join(ROOT, folder)));
  return found;
}

describe("support address", () => {
  it("is support@usegradea.com, in one shared content file", () => {
    expect(getContent("shared/contact").supportEmail).toBe("support@usegradea.com");
    expect(supportEmail()).toBe("support@usegradea.com");
    expect(supportMailto()).toBe("mailto:support@usegradea.com");
  });

  it("is never typed anywhere else in the code or the content", () => {
    const sources = files(["app", "components", "lib", "content"], /\.(tsx?|json)$/).filter(
      (file) => !file.endsWith(join("content", "shared", "contact.json")),
    );
    for (const file of sources) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/support@|mailto:support/i);
    }
  });
});
