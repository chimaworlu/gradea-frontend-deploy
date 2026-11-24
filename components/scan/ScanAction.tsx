"use client";

import type { RefObject } from "react";
import { getContent } from "../../lib/content";
import { scanButtonLabel, type ScanType, type Viewer } from "../../lib/scan/upload";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./upload.module.css";

export type ScanActionProps = {
  viewer: Viewer;
  scanType: ScanType;
  uploading: boolean;
  /** Job-specific with nothing pasted yet: the button is off, with the reason beside it. */
  jobDescriptionMissing: boolean;
  onScan: () => void;
  button?: RefObject<HTMLButtonElement | null>;
};

/**
 * "Scan my CV", or "Match my CV" for a guest on Job-specific, where it is the way to the signup
 * wall. A guest on General has no button: choosing a CV uploads it (A1 dev notes).
 */
export function ScanAction({
  viewer,
  scanType,
  uploading,
  jobDescriptionMissing,
  onScan,
  button,
}: ScanActionProps) {
  const text = getContent("app/upload");
  if (viewer.kind === "guest" && scanType === "general") return null;

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
