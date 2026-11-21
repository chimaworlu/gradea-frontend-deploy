"use client";

import { ScoreCategory } from "../../lib/api/shared";
import { fillPlaceholders, getContent, scoreCategoryLabel } from "../../lib/content";
import { fileSizeLabel } from "../../lib/scan/upload";
import { SignupForm } from "../auth/SignupForm";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./upload.module.css";

export type SignupWallProps = {
  fileName: string;
  fileSize: number;
  /** Claims the waiting scan once the account exists. */
  onSignedUp: () => void;
};

/**
 * A3 Signup wall, after a guest's CV is uploaded (Build Plan Phase 2, FR-23). Left: a blurred
 * preview of the results with no real score, because the scan is scored only after it is
 * claimed. Right: the sign-up form with the wall's own words and the same checks as A4.
 */
export function SignupWall({ fileName, fileSize, onSignedUp }: SignupWallProps) {
  const text = getContent("app/signup-wall");
  const upload = getContent("app/upload");

  return (
    <main className={styles.wall}>
      <section>
        <div className={styles.preview} aria-label={text.preview.locked}>
          <p className={styles.previewScore}>
            <span className={styles.ring} aria-hidden="true">
              <span className={styles.ringValue} />
            </span>
            <span>
              {text.preview.overallScore}
              <span className={styles.lock}>
                <FieldIcon name="lock" />
              </span>
            </span>
          </p>
          {ScoreCategory.options.map((category) => (
            <p key={category} className={styles.previewRow}>
              <span>{scoreCategoryLabel(category)}</span>
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
            heading: text.form.heading,
            subline: text.form.subline,
            submit: text.form.submit,
            onSignedUp,
          }}
        />
      </section>
    </main>
  );
}
