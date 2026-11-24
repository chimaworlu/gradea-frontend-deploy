"use client";

import type { RefObject } from "react";
import { getContent } from "../../lib/content";
import { scanButtonLabel, type ScanType, type Viewer } from "../../lib/scan/upload";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./upload.module.css";

export type ScanActionProps = {
  viewer: Viewer;
  scanType: ScanType;
  /** A CV is chosen. Without one there is no button. */
  hasFile: boolean;
  status: "idle" | "uploading" | "failed";
  /** Job-specific with nothing pasted yet: the button is off, with the reason beside it. */
  jobDescriptionMissing: boolean;
  onScan: () => void;
  button?: RefObject<HTMLButtonElement | null>;
};

/**
 * "Scan my CV", or "Match my CV" for a guest on Job-specific, where it is the way to the signup
 * wall. A guest on General has no button, because choosing a CV uploads it (A1 dev notes), except
 * when the CV was chosen on Job-specific and is still waiting after the switch (founder's
 * decision, 24 Nov): the upload then starts here. While it runs or after it failed, the status
 * line or "Try again" shows instead.
 */
export function ScanAction({
  viewer,
  scanType,
  hasFile,
  status,
  jobDescriptionMissing,
  onScan,
  button,
}: ScanActionProps) {
  const text = getContent("app/upload");
  const uploading = status === "uploading";
  const guestGeneral = viewer.kind === "guest" && scanType === "general";
  if (!hasFile || (guestGeneral && status !== "idle")) return null;

  return (
    <div className={styles.actions}>
      <button
        ref={button}
        type="button"
        className={styles.primary}
        onClick={onScan}
        disabled={uploading || jobDescriptionMissing}
        aria-busy={uploading ? true : undefined}
        aria-describedby={jobDescriptionMissing ? "job-description-missing" : undefined}
      >
        {uploading ? (
          <>
            <FieldIcon name="loader" className={styles.spinner} />
            {text.scanButton.loading}
          </>
        ) : (
          scanButtonLabel(viewer, scanType)
        )}
      </button>
      {jobDescriptionMissing ? (
        <p id="job-description-missing" className={styles.actionNote}>
          {text.jobDescription.missing}
        </p>
      ) : null}
    </div>
  );
}
