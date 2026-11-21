import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScanFileLine } from "../components/scan/ScanFileLine";
import { scanFinished, statusView } from "../lib/scan/status";
import { clearScanFileInfo, readScanFileInfo, saveScanFileInfo } from "../lib/scan/scan-file-info";
import { saveWaitingScan, takeWaitingScan } from "../lib/scan/waiting-scan";

/** An in-memory stand-in for sessionStorage, shared across "pages" like a real tab. */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

function blockedStorage(): Storage {
  const blocked = () => {
    throw new Error("blocked");
  };
  return {
    length: 0,
    clear: blocked,
    getItem: blocked,
    key: blocked,
    removeItem: blocked,
    setItem: blocked,
  };
}

const cv = { name: "my-cv.pdf", size: 412 * 1024 };

describe("the file line on B1", () => {
  it("shows after a signed-in upload, with the icon, name and size", () => {
    const storage = memoryStorage();
    saveScanFileInfo("scan1", cv, storage);
    const file = readScanFileInfo("scan1", storage);
    expect(file).toEqual(cv);
    const html = renderToStaticMarkup(createElement(ScanFileLine, { file }));
    expect(html).toContain("my-cv.pdf, 412 KB");
    expect(html).toContain("<svg");
  });

  it("shows after a guest signs up and the scan is claimed", () => {
    const storage = memoryStorage();
    // Saved at the upload, while the wall opens; the claim takes the waiting scan, not the line.
    saveScanFileInfo("scan1", cv, storage);
    saveWaitingScan(
      { scanSessionId: "scan1", guestToken: "t", expiresAt: "2099-01-01T00:00:00.000Z" },
      storage,
    );
    expect(takeWaitingScan(new Date("2026-11-21T12:00:00.000Z"), storage)).toBeDefined();
    expect(readScanFileInfo("scan1", storage)).toEqual(cv);
  });

  it("still shows after a refresh, and only for its own scan", () => {
    const storage = memoryStorage();
    saveScanFileInfo("scan1", cv, storage);
    // A refresh reads the same tab storage again.
    expect(readScanFileInfo("scan1", storage)).toEqual(cv);
    expect(readScanFileInfo("scan2", storage)).toBeUndefined();
  });

  it("is cleared when the scan is done or failed", () => {
    const storage = memoryStorage();
    saveScanFileInfo("scan1", cv, storage);
    const done = statusView(
      {
        kind: "ok",
        data: { scan_session_id: "scan1", status: "done", retry_after: null, failure: null },
      },
      "scan1",
      3,
    );
    const working = statusView(
      {
        kind: "ok",
        data: { scan_session_id: "scan1", status: "working", retry_after: 2, failure: null },
      },
      "scan1",
      3,
    );
    expect(scanFinished(working)).toBe(false);
    expect(scanFinished(done)).toBe(true);
    clearScanFileInfo("scan1", storage);
    expect(readScanFileInfo("scan1", storage)).toBeUndefined();
  });

  it("is hidden when storage is blocked, and nothing breaks", () => {
    const storage = blockedStorage();
    expect(saveScanFileInfo("scan1", cv, storage)).toBe(false);
    const file = readScanFileInfo("scan1", storage);
    expect(file).toBeUndefined();
    expect(() => clearScanFileInfo("scan1", storage)).not.toThrow();
    expect(renderToStaticMarkup(createElement(ScanFileLine, { file }))).toBe("");
  });
});
