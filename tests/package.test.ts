import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type PackageJson = {
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function isPackageJson(value: unknown): value is PackageJson {
  return typeof value === "object" && value !== null;
}

const parsed: unknown = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
if (!isPackageJson(parsed)) {
  throw new Error("package.json is not an object.");
}
const pkg = parsed;

// SRS Section 2: Node 26.13.0 exactly, and every package pinned to an exact version.
describe("package.json", () => {
  it("pins Node to exactly 26.13.0", () => {
    expect(pkg.engines?.node).toBe("26.13.0");
  });

  it("pins every dependency to an exact version", () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(all).length).toBeGreaterThan(0);
    for (const [name, version] of Object.entries(all)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});
