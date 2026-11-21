"use client";

import { useEffect } from "react";
import { UPLOAD_PATH } from "../../lib/scan/upload";
import { readWaitingScan } from "../../lib/scan/waiting-scan";

/**
 * After a Google log in the API sends the browser to / (GOOGLE_FRONTEND_PATHS.signedIn). When a
 * guest scan is waiting in this tab, go on to /upload, where it is claimed. Renders nothing and
 * makes no network call, so the coming-soon page stays as it is (PRD FR-55).
 */
export function WaitingScanRedirect() {
  useEffect(() => {
    if (readWaitingScan() !== undefined) window.location.replace(UPLOAD_PATH);
  }, []);
  return null;
}
