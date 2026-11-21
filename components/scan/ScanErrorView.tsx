"use client";

import Link from "next/link";
import { fillPlaceholders, getContent } from "../../lib/content";
import { canTryAgain, scanErrorWording, type ScanErrorReason } from "../../lib/scan/scan-error";
import { UPLOAD_PATH, fileSizeLabel } from "../../lib/scan/upload";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./scan.module.css";

export type ScanErrorViewProps = {
  reason: ScanErrorReason;
  /** The uploaded file, when this tab still knows it. */
  file?: { name: string; size: number } | undefined;
  onTryAgain?: () => void;
  retrying?: boolean;
  /** A problem with "Try again" itself, for example no connection. */
  error?: string | undefined;
};

/**
 * B2 Scan error ("AI failed" and "Unreadable file" frames). "Try again" only where it can help;
 * "Upload another CV" always goes back to A1, as a text link beside "Try again" or as the main
 * button when it is the only way on.
 */
export function ScanErrorView({ reason, file, onTryAgain, retrying, error }: ScanErrorViewProps) {
  const text = getContent("app/scan-error");
  const fileSummary = getContent("app/upload").uploadBox.fileSummary;
  const wording = scanErrorWording(reason);
  const tryAgain = canTryAgain(reason) && onTryAgain !== undefined;

  return (
    <main className={styles.main}>
      <span className={styles.errorIcon}>
        <FieldIcon name="alert" />
      </span>
      <h1 className={styles.heading}>{wording.heading}</h1>
      <p className={styles.subline}>{wording.body}</p>
      {file !== undefined ? (
        <p className={styles.file}>
          <FieldIcon name="file" />
          {fillPlaceholders(fileSummary, { name: file.name, size: fileSizeLabel(file.size) })}
        </p>
      ) : null}
      <div className={styles.actions}>
        {tryAgain ? (
          <>
            <button
              type="button"
              className={styles.primary}
              onClick={onTryAgain}
              disabled={retrying}
              aria-busy={retrying ? true : undefined}
            >
              {retrying ? text.actions.tryAgain.loading : text.actions.tryAgain.default}
            </button>
            <Link className={styles.textLink} href={UPLOAD_PATH}>
              {text.actions.uploadAnother}
            </Link>
          </>
        ) : (
          <Link className={styles.primary} href={UPLOAD_PATH}>
            {text.actions.uploadAnother}
          </Link>
        )}
      </div>
      <p className={styles.formError} role="alert">
        {error ?? ""}
      </p>
    </main>
  );
}
