import { z } from "zod";
import { AFTER_AUTH_PATH } from "../auth/forms";
import { UPLOAD_PATH } from "./upload";

// A guest's uploaded scan waiting to be claimed (SRS Section 4, POST /api/scan/:id/claim).
// While the A3 wall is open, its id, guest token and expiry are kept in sessionStorage, so
// "Continue with Google" and the wall's "Log in" can leave the page without losing the scan.
// Only sessionStorage: never the address, a cookie or lasting storage (security.md section 1). The
// server stores only the token's hash and the token works once, within 30 minutes. Every read
// and write is wrapped, so with storage blocked the page still works and those two ways simply
// do not keep the scan.

const STORAGE_KEY = "gradea.waitingScan";

const WaitingScan = z.strictObject({
  scanSessionId: z.string().min(1),
  guestToken: z.string().min(1),
  expiresAt: z.iso.datetime(),
});
export type WaitingScan = z.infer<typeof WaitingScan>;

/** The page's sessionStorage, or undefined when there is none or reading it is blocked. */
function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    // Blocked storage (for example strict privacy settings) throws on access.
    return undefined;
  }
}

/** Keeps the waiting scan for this tab. False when storage is blocked or full. */
export function saveWaitingScan(scan: WaitingScan, storage = browserStorage()): boolean {
  if (storage === undefined) return false;
  try {
    // Only these three fields, whatever the caller passes: never a password, email or CV text.
    const { scanSessionId, guestToken, expiresAt } = scan;
    storage.setItem(STORAGE_KEY, JSON.stringify({ scanSessionId, guestToken, expiresAt }));
    return true;
  } catch {
    // Not kept: the email form on the wall still claims the scan from memory.
    return false;
  }
}

export function clearWaitingScan(storage = browserStorage()): void {
  if (storage === undefined) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing more to do: with storage blocked there was nothing kept either.
    return;
  }
}

/**
 * The waiting scan, if one is kept and its 30 minutes have not run out. An expired or damaged
 * entry is cleared, so it is never sent.
 */
export function readWaitingScan(
  now: Date = new Date(),
  storage = browserStorage(),
): WaitingScan | undefined {
  if (storage === undefined) return undefined;
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;
  const parsed = WaitingScan.safeParse(parseJson(raw));
  if (!parsed.success || Date.parse(parsed.data.expiresAt) <= now.getTime()) {
    clearWaitingScan(storage);
    return undefined;
  }
  return parsed.data;
}

/** Reads and clears in one step, so the scan is claimed at most once per page. */
export function takeWaitingScan(
  now: Date = new Date(),
  storage = browserStorage(),
): WaitingScan | undefined {
  const scan = readWaitingScan(now, storage);
  if (scan !== undefined) clearWaitingScan(storage);
  return scan;
}

/** After a log in: back to the upload page when a scan is waiting, so it can be claimed. */
export function pathAfterLogin(now: Date = new Date(), storage = browserStorage()): string {
  return readWaitingScan(now, storage) === undefined ? AFTER_AUTH_PATH : UPLOAD_PATH;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
