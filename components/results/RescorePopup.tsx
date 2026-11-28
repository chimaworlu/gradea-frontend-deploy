"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { CareerLevel, UsageResponse } from "../../lib/api/shared";
import { errorMessage, getContent } from "../../lib/content";
import { currentScoreLabel, rescoreCheck } from "../../lib/scan/rescore";
import {
  UPLOAD_PATH,
  checkFiles,
  checkJobDescription,
  fileProblemMessage,
  rescanCv,
  uploadCv,
  uploadOutcome,
  type JobDescriptionCode,
  type ScanType,
} from "../../lib/scan/upload";
import { usageLine } from "../../lib/scan/usage";
import { FieldIcon } from "../icons/FieldIcon";
import { CareerLevelMenu } from "../scan/CareerLevelMenu";
import { CvUploadBox } from "../scan/CvUploadBox";
import { JobDescriptionField } from "../scan/JobDescriptionField";
import uploadStyles from "../scan/upload.module.css";
import styles from "./rescore.module.css";

export type RescoreStarted = {
  path: string;
  scanSessionId: string;
  scanType: ScanType;
  /** The new file, when one was chosen, for the line on the processing screen. */
  file: File | undefined;
};

export type RescorePopupProps = {
  /** The results page's own mode and scan. */
  pageType: ScanType;
  scanSessionId: string;
  /** The page's score as shown there: "74", or "72%" for a Job-specific result. */
  score: string;
  /** The popup's mode; the top bar switch follows it while the popup is open (B6 dev notes). */
  mode: ScanType;
  onModeChange: (mode: ScanType) => void;
  careerLevel: CareerLevel;
  usage: UsageResponse | undefined;
  onClose: () => void;
  onStarted: (started: RescoreStarted) => void;
  onLimit: (resetAt: string, scanType: ScanType) => void;
};

type Failure = { message: string; offerUpload: boolean };

const FOCUSABLE = "button:not([disabled]), textarea, a[href], [tabindex]:not([tabindex='-1'])";

/**
 * B6 Re-score popup (Build Plan Phase 3, PRD FR-28). Scanning the page's own mode again needs a
 * new CV (B6 dev notes); on the other mode the file may be left empty, and the CV from these
 * results is scanned again by its id. The job description is kept in this popup's memory only,
 * never stored, logged or put in the address (PRD FR-54), and is entered fresh each time.
 */
export function RescorePopup({
  pageType,
  scanSessionId,
  score,
  mode,
  onModeChange,
  careerLevel,
  usage,
  onClose,
  onStarted,
  onLimit,
}: RescorePopupProps) {
  const text = getContent("app/rescore").popup;
  const upload = getContent("app/upload");
  const [file, setFile] = useState<File | undefined>(undefined);
  const [boxProblem, setBoxProblem] = useState<string | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const [jobText, setJobText] = useState("");
  const [jobProblem, setJobProblem] = useState<JobDescriptionCode | undefined>(undefined);
  const [level, setLevel] = useState<CareerLevel>(careerLevel);
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState<Failure | undefined>(undefined);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const jobTextArea = useRef<HTMLTextAreaElement>(null);
  // A ref as well as state, so a double click never sends two scans.
  const inFlight = useRef(false);
  const dragDepth = useRef(0);

  // Focus moves in on open. The top bar puts it back on the button that opened the popup.
  useEffect(() => {
    closeButton.current?.focus();
  }, []);

  const jobSpecific = mode === "smart_target";
  const check = rescoreCheck({ pageType, mode, hasFile: file !== undefined, jobText });
  const usageText = usage === undefined ? undefined : usageLine(usage, mode);

  function takeFiles(files: readonly File[]) {
    if (uploading) return;
    setFailure(undefined);
    const checked = checkFiles(files);
    if (checked.kind === "problem") {
      setFile(undefined);
      setBoxProblem(fileProblemMessage(checked.problem));
      return;
    }
    setBoxProblem(undefined);
    setFile(checked.file);
  }

  async function scan() {
    if (inFlight.current || check.kind === "blocked") return;
    let jobDescription: string | undefined;
    if (jobSpecific) {
      const checked = checkJobDescription(jobText);
      if (checked.kind === "problem") {
        setJobProblem(checked.code);
        jobTextArea.current?.focus();
        return;
      }
      jobDescription = checked.text;
    }
    inFlight.current = true;
    setUploading(true);
    setFailure(undefined);
    const fields = { careerLevel: level, jobDescription };
    const result =
      file === undefined
        ? await rescanCv(scanSessionId, fields)
        : await uploadCv(file, fields);
    inFlight.current = false;
    setUploading(false);
    const outcome = uploadOutcome(result);
    switch (outcome.kind) {
      case "processing":
        onStarted({
          path: outcome.path,
          scanSessionId: outcome.scanSessionId,
          scanType: mode,
          file,
        });
        return;
      case "limit":
        onLimit(outcome.resetAt, mode);
        return;
      case "fileError":
        setFile(undefined);
        setBoxProblem(outcome.message);
        return;
      case "scanError":
        // The server read the new file and could not use it: said under the box.
        setFile(undefined);
        setBoxProblem(errorMessage(outcome.code));
        return;
      case "jobDescriptionError":
        setJobProblem(outcome.code);
        jobTextArea.current?.focus();
        return;
      case "scanNotFound":
        setFailure({ message: outcome.message, offerUpload: true });
        return;
      case "wall":
        // Results are for a signed-in owner only, so a guest answer means the session ended.
        setFailure({ message: errorMessage("not_signed_in"), offerUpload: false });
        return;
      case "failed":
        setFailure({ message: outcome.message, offerUpload: false });
        return;
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // The career level menu closes itself on Escape and marks the key handled.
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || dialog.current === null) return;
    // Focus stays inside: Tab from the last control goes to the first, and back.
    const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // The dim layer takes a dropped file, so a missed drop never opens it in the tab.
  const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");
  const dropHandlers = {
    onDragEnter: (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (event: DragEvent) => {
      if (carriesFiles(event)) event.preventDefault();
    },
    onDragLeave: (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      takeFiles(Array.from(event.dataTransfer.files));
    },
  };

  const note =
    check.kind === "blocked"
      ? check.reason === "file"
        ? text.fileMissing
        : upload.jobDescription.missing
      : undefined;

  return (
    <div
      className={uploadStyles.scrim}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        // A press on the dim layer itself closes the popup.
        if (event.target === event.currentTarget && !uploading) onClose();
      }}
      {...dropHandlers}
    >
      <div
        ref={dialog}
        className={`${uploadStyles.popup} ${styles.popup}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rescore-title"
      >
        <h2 id="rescore-title" className={styles.title}>
          {text.title}
        </h2>
        <button
          ref={closeButton}
          type="button"
          className={uploadStyles.popupClose}
          onClick={onClose}
          aria-label={text.close}
        >
          <FieldIcon name="close" />
        </button>

        <div className={uploadStyles.switch} role="group" aria-label={upload.modeSwitch.label}>
          {(["general", "smart_target"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`${uploadStyles.switchOption} ${mode === option ? uploadStyles.switchSelected : ""}`}
              aria-pressed={mode === option}
              onClick={() => {
                if (option === mode) return;
                setFailure(undefined);
                onModeChange(option);
              }}
              disabled={uploading}
            >
              <span>
                {option === "general" ? upload.modeSwitch.general : upload.modeSwitch.jobSpecific}
              </span>
            </button>
          ))}
        </div>
        <p className={uploadStyles.switchHelper}>
          {jobSpecific ? upload.modeSwitch.jobSpecificHelper : upload.modeSwitch.generalHelper}
        </p>

        <p className={styles.scoreChip}>{currentScoreLabel(score, pageType, mode)}</p>

        <CvUploadBox
          idBase="rescore-cv-file"
          file={file}
          problem={boxProblem}
          dragging={dragging}
          disabled={uploading}
          onFiles={takeFiles}
          onRemove={() => {
            setFile(undefined);
            setFailure(undefined);
          }}
        />
        {mode !== pageType && file === undefined ? (
          <p className={styles.sameCv}>{text.sameCv}</p>
        ) : null}

        {jobSpecific ? (
          <JobDescriptionField
            value={jobText}
            onValueChange={(value) => {
              setJobText(value);
              setJobProblem(undefined);
            }}
            problem={jobProblem}
            readOnly={uploading}
            textArea={jobTextArea}
          />
        ) : null}

        <div className={styles.career}>
          <CareerLevelMenu
            value={level}
            onValueChange={setLevel}
            disabled={uploading}
            wording={text.careerLevel}
          />
        </div>
        {/* Free only: PRO has no monthly limit, so no line (B6 dev notes). */}
        {usageText !== undefined ? (
          <p className={`${uploadStyles.usage} ${styles.usage}`}>{usageText}</p>
        ) : null}

        <p className={uploadStyles.failed} aria-live="assertive" hidden={failure === undefined}>
          <FieldIcon name="alert" />
          {failure?.message ?? ""}
          {failure?.offerUpload ? (
            <Link className={styles.uploadLink} href={UPLOAD_PATH}>
              {getContent("app/rescore").topBar.uploadLink}
            </Link>
          ) : null}
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={uploadStyles.textButton}
            onClick={onClose}
            disabled={uploading}
          >
            {text.cancel}
          </button>
          {note !== undefined ? (
            <p id="rescore-note" className={uploadStyles.actionNote}>
              {note}
            </p>
          ) : null}
          <button
            type="button"
            className={uploadStyles.primary}
            onClick={() => void scan()}
            disabled={uploading || note !== undefined}
            aria-busy={uploading ? true : undefined}
            aria-describedby={note !== undefined ? "rescore-note" : undefined}
          >
            {uploading ? (
              <>
                <FieldIcon name="loader" className={uploadStyles.spinner} />
                {upload.scanButton.loading}
              </>
            ) : (
              upload.scanButton.default
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
