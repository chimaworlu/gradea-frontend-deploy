import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../scripts/build-design-tokens.mjs", import.meta.url));
const tempDirs: string[] = [];

function auditFolderWith(fileName: string, contents: string) {
  const dir = mkdtempSync(join(tmpdir(), "gradea-audit-"));
  tempDirs.push(dir);
  writeFileSync(join(dir, fileName), contents);
  return spawnSync(process.execPath, [script, "--audit", dir], { encoding: "utf8" });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The token audit is part of npm run check (SRS Section 13), so it must really fail on bad values.
describe("token audit", () => {
  it("passes a stylesheet that uses token variables only", () => {
    const result = auditFolderWith(
      "ok.module.css",
      ".box { color: var(--color-primary); padding: var(--space-16); }\n",
    );
    expect(result.status).toBe(0);
  });

  it("fails on a raw colour", () => {
    // The audit must flag this raw value, so the fixture is built from parts.
    const rawColour = ["#", "ff", "00", "00"].join("");
    const result = auditFolderWith("bad.module.css", `.box { color: ${rawColour}; }\n`);
    expect(result.status).toBe(1);
  });

  it("fails on raw px spacing", () => {
    const rawPx = ["16", "px"].join("");
    const result = auditFolderWith("bad.module.css", `.box { padding: ${rawPx}; }\n`);
    expect(result.status).toBe(1);
  });

  it("fails on a primitive colour variable", () => {
    const primitive = ["--primitive", "primary-40"].join("-");
    const result = auditFolderWith("bad.module.css", `.box { color: var(${primitive}); }\n`);
    expect(result.status).toBe(1);
  });
});
