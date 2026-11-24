"use client";

import { KeywordGroup, ScoreCategory, type ScanType } from "../../lib/api/shared";
import {
  fillPlaceholders,
  getContent,
  keywordGroupLabel,
  scoreCategoryLabel,
} from "../../lib/content";
import { fileSizeLabel } from "../../lib/scan/upload";
import { SignupForm } from "../auth/SignupForm";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./upload.module.css";

export type SignupWallProps = {
  scanType: ScanType;
  fileName: string;
  fileSize: number;
  /** Claims the waiting scan once the account exists. */
  onSignedUp: () => void;
  /** Keeps the chosen career level with the waiting scan, for the Google way. */
  onCareerLevelChange: (level: string) => void;
};

/**
 * A3 Signup wall, after a guest's CV is uploaded (Build Plan Phase 2, FR-23). Left: a blurred
 * preview of the results with no real score, because the scan is scored only after it is
 * claimed. Right: the sign-up form with the wall's own words and the same checks as A4. For a
 * Job-specific scan the preview names what it gives: the Relevancy score and the keyword groups.
 */
export function SignupWall({
  scanType,
  fileName,
  fileSize,
  onSignedUp,
  onCareerLevelChange,
}: SignupWallProps) {
  const text = getContent("app/signup-wall");
  const upload = getContent("app/upload");
  const words = scanType === "smart_target" ? text.form.jobSpecific : text.form;
  const preview =
    scanType === "smart_target"
      ? {
          score: getContent("app/job-results").rail.relevancyScore,
          rows: KeywordGroup.options.map(keywordGroupLabel),
        }
      : {
          score: text.preview.overallScore,
          rows: ScoreCategory.options.map(scoreCategoryLabel),
        };

  return (
    <main className={styles.wall}>
      <section>
        <div className={styles.preview} aria-label={text.preview.locked}>
          <p className={styles.previewScore}>
            <span className={styles.ring} aria-hidden="true">
              <span className={styles.ringValue} />
            </span>
            <span>
              {preview.score}
              <span className={styles.lock}>
                <FieldIcon name="lock" />
              </span>
            </span>
          </p>
          {preview.rows.map((row) => (
            <p key={row} className={styles.previewRow}>
              <span>{row}</span>
              <span className={styles.blurred} aria-hidden="true" />
            </p>
          ))}
        </div>
        <p className={styles.uploaded}>
          <span className={styles.check}>
            <FieldIcon name="check" />
          </span>
          {text.preview.uploaded}
        </p>
        <p className={styles.uploadedFile}>
          {fillPlaceholders(upload.uploadBox.fileSummary, {
            name: fileName,
            size: fileSizeLabel(fileSize),
          })}
        </p>
      </section>
      <section className={styles.wallForm}>
        <SignupForm
          wall={{
            heading: words.heading,
            subline: words.subline,
            submit: text.form.submit,
            onSignedUp,
            onCareerLevelChange,
          }}
        />
      </section>
    </main>
  );
}
