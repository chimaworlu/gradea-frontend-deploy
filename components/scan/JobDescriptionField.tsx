"use client";

import type { RefObject } from "react";
import { errorMessage, getContent } from "../../lib/content";
import type { JobDescriptionCode } from "../../lib/scan/upload";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./upload.module.css";

export type JobDescriptionFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  problem: JobDescriptionCode | undefined;
  /** While the upload runs the text cannot be changed. */
  readOnly?: boolean;
  textArea?: RefObject<HTMLTextAreaElement | null>;
};

/**
 * The Job-specific text area (A1 "Job-specific paste" and "text too short"). "From a link" is
 * shown but switched off until its step (Build Plan Phase 3). The text is kept in the page's
 * memory only (PRD FR-54): autoComplete off stops the browser keeping it for a restored tab, and
 * spellCheck off stops a browser's online spell checker sending it away.
 */
export function JobDescriptionField({
  value,
  onValueChange,
  problem,
  readOnly,
  textArea,
}: JobDescriptionFieldProps) {
  const text = getContent("app/upload").jobDescription;
  const describedBy =
    problem === undefined
      ? "job-description-helper"
      : "job-description-problem job-description-helper";

  return (
    <div className={styles.job}>
      <label className={styles.jobLabel} htmlFor="job-description">
        {text.label}
      </label>
      <div className={styles.jobWays} role="group" aria-label={text.waysLabel}>
        <button
          type="button"
          className={`${styles.switchOption} ${styles.jobWay} ${styles.switchSelected}`}
          aria-pressed="true"
        >
          <span>{text.pasteText}</span>
        </button>
        <button
          type="button"
          className={`${styles.switchOption} ${styles.jobWay}`}
          aria-pressed="false"
          disabled
        >
          <span>{text.fromLink}</span>
          <span className={styles.comingSoon}>{text.comingSoon}</span>
        </button>
      </div>
      <textarea
        ref={textArea}
        id="job-description"
        className={`${styles.jobText} ${problem === undefined ? "" : styles.jobTextInvalid}`}
        placeholder={text.placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        readOnly={readOnly}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={problem === undefined ? undefined : true}
        aria-describedby={describedBy}
      />
      <p
        id="job-description-problem"
        className={styles.jobProblem}
        role="alert"
        hidden={problem === undefined}
      >
        <FieldIcon name="alert" />
        {problem === undefined ? "" : errorMessage(problem)}
      </p>
      <p id="job-description-helper" className={styles.jobHelper}>
        {text.helper}
      </p>
    </div>
  );
}
