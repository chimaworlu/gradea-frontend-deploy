import type { ScanType } from "../api/shared";

// The kind of each scan this page has seen, so moving from the upload to processing to the
// results shows the right words from the first moment. In memory only, for this page load: never
// in browser storage. After a reload the next answer says it again.

const known = new Map<string, ScanType>();

export function rememberScanType(scanSessionId: string, scanType: ScanType): void {
  known.set(scanSessionId, scanType);
}

export function knownScanType(scanSessionId: string): ScanType | undefined {
  return known.get(scanSessionId);
}
