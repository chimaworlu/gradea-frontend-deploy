import { z } from "zod";

// The uploaded file's name and size for the line on B1 and B2 ("my-cv.pdf, 412 KB"), kept in
// sessionStorage for this tab under the scan id, so the line shows after a signed-in upload,
// after a guest's sign-up and claim (even through Google), and after a refresh. Only the name
// and the size are kept, never anything from inside the CV. Only sessionStorage: never the
// address, a cookie or lasting storage (security.md section 1). One entry at a time, cleared
// when the scan is done or failed. Every read and write is wrapped, so with storage blocked the
// page still works and the line is simply hidden.

const KEY_PREFIX = "gradea.scanFile.";

const ScanFileInfo = z.strictObject({
  name: z.string().min(1).max(255),
  size: z.int().min(0),
});
export type ScanFileInfo = z.infer<typeof ScanFileInfo>;

/** The page's sessionStorage, or undefined when there is none or reading it is blocked. */
function browserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    // Blocked storage (for example strict privacy settings) throws on access.
    return undefined;
  }
}

function keyFor(scanSessionId: string): string {
  return `${KEY_PREFIX}${scanSessionId}`;
}

/** Drops every kept entry except the one for this scan, so only one is ever kept. */
function dropOthers(storage: Storage, keep: string): void {
  const stale: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null && key.startsWith(KEY_PREFIX) && key !== keep) stale.push(key);
  }
  for (const key of stale) storage.removeItem(key);
}

/** Keeps the file's name and size for this scan. False when storage is blocked or full. */
export function saveScanFileInfo(
  scanSessionId: string,
  file: ScanFileInfo,
  storage = browserStorage(),
): boolean {
  if (storage === undefined) return false;
  try {
    // Only these two fields, whatever the caller passes.
    const { name, size } = file;
    const key = keyFor(scanSessionId);
    dropOthers(storage, key);
    storage.setItem(key, JSON.stringify({ name, size }));
    return true;
  } catch {
    // Not kept: the line is simply hidden.
    return false;
  }
}

/** The kept name and size for this scan, if any. A damaged entry is cleared. */
export function readScanFileInfo(
  scanSessionId: string,
  storage = browserStorage(),
): ScanFileInfo | undefined {
  if (storage === undefined) return undefined;
  let raw: string | null;
  try {
    raw = storage.getItem(keyFor(scanSessionId));
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;
  const parsed = ScanFileInfo.safeParse(parseJson(raw));
  if (!parsed.success) {
    clearScanFileInfo(scanSessionId, storage);
    return undefined;
  }
  return parsed.data;
}

export function clearScanFileInfo(scanSessionId: string, storage = browserStorage()): void {
  if (storage === undefined) return;
  try {
    storage.removeItem(keyFor(scanSessionId));
  } catch {
    // Nothing more to do: with storage blocked there was nothing kept either.
    return;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
