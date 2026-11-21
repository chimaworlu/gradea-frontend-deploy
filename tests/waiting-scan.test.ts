import { describe, expect, it, vi } from "vitest";
import { claimOutcome, claimScan } from "../lib/scan/upload";
import {
  pathAfterLogin,
  readWaitingScan,
  saveWaitingScan,
  takeWaitingScan,
  clearWaitingScan,
} from "../lib/scan/waiting-scan";

/** An in-memory stand-in for sessionStorage. */
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

/** Storage that throws on every use, as when the browser blocks it. */
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

const uploadedAt = new Date("2026-11-21T12:00:00.000Z");
const scan = {
  scanSessionId: "scan1",
  guestToken: "guest-token",
  // 30 minutes from the upload, as the API sends it.
  expiresAt: "2026-11-21T12:30:00.000Z",
};

describe("the waiting guest scan in sessionStorage", () => {
  it("is saved with its expiry and read back until it runs out", () => {
    const storage = memoryStorage();
    expect(saveWaitingScan(scan, storage)).toBe(true);
    expect(readWaitingScan(new Date("2026-11-21T12:29:59.000Z"), storage)).toEqual(scan);
    expect(pathAfterLogin(uploadedAt, storage)).toBe("/upload");
  });

  it("is cleared and never sent once expired", () => {
    const storage = memoryStorage();
    saveWaitingScan(scan, storage);
    expect(readWaitingScan(new Date("2026-11-21T12:30:00.000Z"), storage)).toBeUndefined();
    expect(storage.length).toBe(0);
    expect(pathAfterLogin(uploadedAt, storage)).toBe("/");
  });

  it("is claimed once after returning, then gone", async () => {
    const storage = memoryStorage();
    saveWaitingScan(scan, storage);
    const waiting = takeWaitingScan(uploadedAt, storage);
    expect(waiting).toEqual(scan);
    expect(takeWaitingScan(uploadedAt, storage)).toBeUndefined();

    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const result = await claimScan(scan.scanSessionId, scan.guestToken, fetchFn);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    // The token travels only in its header, never in the address.
    expect(String(url)).not.toContain(scan.guestToken);
    expect(new Headers(init?.headers).get("x-guest-token")).toBe(scan.guestToken);
    expect(claimOutcome(result, scan.scanSessionId)).toEqual({
      kind: "processing",
      path: "/scan/scan1",
    });
  });

  it("shows the limit popup when the claim answers scan_limit_reached", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            code: "scan_limit_reached",
            message: "x",
            reset_at: "2026-11-30T23:00:00.000Z",
          }),
          { status: 403 },
        ),
    );
    const result = await claimScan(scan.scanSessionId, scan.guestToken, fetchFn);
    expect(claimOutcome(result, scan.scanSessionId)).toEqual({
      kind: "limit",
      resetAt: "2026-11-30T23:00:00.000Z",
    });
  });

  it("does not break anything when storage is blocked", () => {
    const storage = blockedStorage();
    expect(saveWaitingScan(scan, storage)).toBe(false);
    expect(readWaitingScan(uploadedAt, storage)).toBeUndefined();
    expect(() => clearWaitingScan(storage)).not.toThrow();
    expect(pathAfterLogin(uploadedAt, storage)).toBe("/");
    // No sessionStorage at all, as on the server.
    expect(readWaitingScan(uploadedAt, undefined)).toBeUndefined();
  });
});
