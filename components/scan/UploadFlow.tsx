"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { CareerLevel } from "../../lib/api/shared";
import { LOGIN_PATH, isCareerLevel } from "../../lib/auth/forms";
import { fillPlaceholders, getContent } from "../../lib/content";
import {
  ACCEPT_ATTRIBUTE,
  UPLOAD_PATH,
  checkFiles,
  claimOutcome,
  claimScan,
  fetchViewer,
  fileProblemMessage,
  fileSizeLabel,
  uploadCv,
  uploadHelperText,
  uploadOutcome,
  viewerFrom,
  type Viewer,
} from "../../lib/scan/upload";
import {
  clearWaitingScan,
  rememberCareerLevel,
  saveWaitingScan,
  takeWaitingScan,
} from "../../lib/scan/waiting-scan";
import { BotCheck } from "../auth/BotCheck";
import { FieldIcon } from "../icons/FieldIcon";
import { CareerLevelMenu } from "./CareerLevelMenu";
import { LimitPopup } from "./LimitPopup";
import { SignupWall } from "./SignupWall";
import styles from "./upload.module.css";

type Status = "idle" | "uploading" | "failed";
type WallState = { scanSessionId: string; guestToken: string; file: File };

/** True when a drag carries files, not text or a link from the page. */
function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

/**
 * A1 Upload, General analysis only (Build Plan Phase 2, PRD 9.2 and 9.3). The Job-specific tab
 * is left out until its phase. Guests: a chosen or dropped CV uploads straight away and the A3
 * wall follows. Signed-in users: "Scan my CV", then the processing screen.
 */
export function UploadFlow() {
  const text = getContent("app/upload");
  const [viewer, setViewer] = useState<Viewer | undefined>(undefined);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [boxProblem, setBoxProblem] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status>("idle");
  const [failedMessage, setFailedMessage] = useState<string | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const [limitResetAt, setLimitResetAt] = useState<string | undefined>(undefined);
  const [careerLevel, setCareerLevel] = useState<CareerLevel | undefined>(undefined);
  const [wall, setWall] = useState<WallState | undefined>(undefined);
  const [botToken, setBotToken] = useState<string | undefined>(undefined);
  const [botResetKey, setBotResetKey] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const scanButton = useRef<HTMLButtonElement>(null);
  // A ref as well as state, so a double click or a second drop never sends two uploads.
  const inFlight = useRef(false);
  const dragDepth = useRef(0);

  const busy = status === "uploading" || viewer === undefined || wall !== undefined;

  // The session is checked once, when the page loads; nothing polls it (AGENTS.md section 5).
  // A user back from Google or the log in page with a guest scan waiting in this tab gets it
  // claimed once, then goes on to processing (or sees the limit popup).
  useEffect(() => {
    void fetchViewer().then(async (result) => {
      const found = viewerFrom(result);
      // Taken (read and cleared) in one step, so the scan is claimed at most once.
      const waiting = found.kind === "signedIn" ? takeWaitingScan() : undefined;
      if (waiting !== undefined) {
        const outcome = claimOutcome(
          await claimScan(waiting.scanSessionId, waiting.guestToken),
          waiting.scanSessionId,
        );
        if (outcome.kind === "processing") {
          window.location.assign(outcome.path);
          return;
        }
        if (outcome.kind === "limit") setLimitResetAt(outcome.resetAt);
      }
      setViewer(found);
      if (found.kind === "signedIn") setCareerLevel(found.user.career_level);
    });
  }, []);

  async function upload(chosen: File, who: Viewer) {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("uploading");
    setFailedMessage(undefined);
    const result = await uploadCv(chosen, who.kind === "signedIn" ? { careerLevel } : { botToken });
    inFlight.current = false;
    // A bot token works once, so a guest gets a fresh one for any next try.
    if (who.kind === "guest") setBotResetKey((key) => key + 1);
    const outcome = uploadOutcome(result);
    switch (outcome.kind) {
      case "processing":
        window.location.assign(outcome.path);
        return;
      case "wall":
        setStatus("idle");
        // Kept for this tab while the wall is open, so Google or Log in do not lose the scan.
        saveWaitingScan({
          scanSessionId: outcome.scanSessionId,
          guestToken: outcome.guestToken,
          expiresAt: outcome.expiresAt,
        });
        setWall({
          scanSessionId: outcome.scanSessionId,
          guestToken: outcome.guestToken,
          file: chosen,
        });
        return;
      case "limit":
        setStatus("idle");
        setLimitResetAt(outcome.resetAt);
        return;
      case "fileError":
        setStatus("idle");
        setFile(undefined);
        setBoxProblem(outcome.message);
        return;
      case "failed":
        setStatus("failed");
        setFailedMessage(outcome.message);
        return;
    }
  }

  function takeFiles(files: readonly File[]) {
    if (busy || viewer === undefined) return;
    setFailedMessage(undefined);
    setStatus("idle");
    const checked = checkFiles(files);
    if (checked.kind === "problem") {
      setFile(undefined);
      setBoxProblem(fileProblemMessage(checked.problem));
      return;
    }
    setBoxProblem(undefined);
    setFile(checked.file);
    // No scan button for guests: choosing a CV uploads it and the wall follows (A1 dev notes).
    if (viewer.kind === "guest") void upload(checked.file, viewer);
  }

  // Latest version for the page-wide listeners below, which are added once.
  const takeFilesRef = useRef(takeFiles);
  useEffect(() => {
    takeFilesRef.current = takeFiles;
  });

  // The whole page accepts a dropped file, so a missed drop never opens the file in the tab and
  // takes the user off the site (A1 dev notes).
  useEffect(() => {
    const enter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (carriesFiles(event)) event.preventDefault();
    };
    const leave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const drop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      takeFilesRef.current(Array.from(event.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    takeFiles(Array.from(event.target.files ?? []));
    // Cleared so choosing the same file again still counts as a change.
    event.target.value = "";
  }

  function removeFile() {
    clearWaitingScan();
    setFile(undefined);
    setStatus("idle");
    setFailedMessage(undefined);
  }

  async function claimAfterSignup(waiting: WallState) {
    // Signed up with the email form: the token is still in memory, so the kept copy goes.
    clearWaitingScan();
    const outcome = claimOutcome(
      await claimScan(waiting.scanSessionId, waiting.guestToken),
      waiting.scanSessionId,
    );
    // Claimed: on to processing. Otherwise (for example the 30 minute guest session ran out,
    // or the limit) the new Free user starts again on A1.
    window.location.assign(outcome.kind === "processing" ? outcome.path : UPLOAD_PATH);
  }

  const topBar = (
    <header className={styles.topBar}>
      {/* Logo / Lockup, used exactly as exported (never redrawn). */}
      <Image
        src="/brand/gradea-logo-light.svg"
        alt={text.topBar.logoAlt}
        width={107}
        height={32}
        priority
      />
      {/* Signed in: the account avatar and its menu (S2) go here when that screen is built. */}
      {viewer?.kind === "guest" ? (
        <Link className={styles.topBarLogIn} href={LOGIN_PATH}>
          {text.topBar.logIn}
        </Link>
      ) : null}
    </header>
  );

  if (wall !== undefined) {
    return (
      <div className={styles.page}>
        {topBar}
        <SignupWall
          fileName={wall.file.name}
          fileSize={wall.file.size}
          onSignedUp={() => void claimAfterSignup(wall)}
          onCareerLevelChange={(level) => {
            if (isCareerLevel(level)) rememberCareerLevel(level);
          }}
        />
      </div>
    );
  }

  const boxClass = [
    styles.box,
    dragging ? styles.boxDragging : "",
    !dragging && boxProblem !== undefined ? styles.boxError : "",
    !dragging && boxProblem === undefined && file !== undefined ? styles.boxChosen : "",
    !dragging && boxProblem === undefined && file === undefined ? styles.boxEmpty : "",
  ].join(" ");

  const showFile = file !== undefined && !dragging;

  return (
    <div className={styles.page}>
      {topBar}
      <main className={styles.main}>
        <h1 className={styles.heading}>{text.hero.heading}</h1>
        <p className={styles.subline}>{text.hero.subline}</p>

        {/* Job-specific is shown but switched off until its phase (Build Plan Phase 3). */}
        <div className={styles.switch} role="group" aria-label={text.modeSwitch.label}>
          <button
            type="button"
            className={`${styles.switchOption} ${styles.switchSelected}`}
            aria-pressed="true"
          >
            <span>{text.modeSwitch.general}</span>
          </button>
          <button type="button" className={styles.switchOption} aria-pressed="false" disabled>
            <span>{text.modeSwitch.jobSpecific}</span>
            <span className={styles.comingSoon}>{text.modeSwitch.comingSoon}</span>
          </button>
        </div>
        <p className={styles.switchHelper}>{text.modeSwitch.generalHelper}</p>

        <section className={boxClass} aria-label={text.uploadBox.label}>
          <input
            ref={fileInput}
            id="cv-file"
            className={styles.fileInput}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            onChange={onInputChange}
            disabled={busy}
            tabIndex={-1}
            aria-hidden="true"
          />
          <span className={styles.boxIcon}>
            <FieldIcon name={showFile ? "file" : "upload"} />
          </span>
          {showFile ? (
            <>
              <p className={styles.fileName}>
                {fillPlaceholders(text.uploadBox.fileSummary, {
                  name: file.name,
                  size: fileSizeLabel(file.size),
                })}
              </p>
              <div className={styles.fileActions}>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={removeFile}
                  disabled={busy}
                >
                  {text.uploadBox.remove}
                </button>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => fileInput.current?.click()}
                  disabled={busy}
                >
                  {text.uploadBox.chooseDifferent}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.boxTitle}>
                {dragging ? text.uploadBox.draggingTitle : text.uploadBox.title}
              </p>
              <p className={styles.boxOr}>{text.uploadBox.or}</p>
              <button
                type="button"
                className={styles.chooseButton}
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                aria-describedby="cv-file-helper cv-file-problem"
              >
                {text.uploadBox.choose}
              </button>
              <p id="cv-file-helper" className={styles.boxHelper}>
                {uploadHelperText()}
              </p>
            </>
          )}
        </section>
        <p
          id="cv-file-problem"
          className={styles.boxProblem}
          aria-live="polite"
          hidden={boxProblem === undefined}
        >
          <FieldIcon name="alert" />
          {boxProblem ?? ""}
        </p>

        {viewer?.kind === "signedIn" && careerLevel !== undefined && file !== undefined ? (
          <>
            <CareerLevelMenu
              value={careerLevel}
              onValueChange={setCareerLevel}
              disabled={status === "uploading"}
            />
            {/* The "4 of 5 General scans left this month" line goes here, for Free users only,
                once the API sends the usage (no usage endpoint yet). */}
            <div className={styles.actions}>
              <button
                ref={scanButton}
                type="button"
                className={styles.primary}
                onClick={() => void upload(file, viewer)}
                disabled={status === "uploading"}
                aria-busy={status === "uploading" ? true : undefined}
              >
                {status === "uploading" ? (
                  <>
                    <FieldIcon name="loader" className={styles.spinner} />
                    {text.scanButton.loading}
                  </>
                ) : (
                  text.scanButton.default
                )}
              </button>
            </div>
          </>
        ) : null}

        {viewer?.kind === "guest" && status === "uploading" ? (
          <p className={styles.status} role="status">
            <FieldIcon name="loader" className={styles.spinner} />
            {text.uploadBox.uploading}
          </p>
        ) : null}

        {viewer?.kind === "guest" && status === "failed" && file !== undefined ? (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => void upload(file, viewer)}
            >
              {text.uploadBox.tryAgain}
            </button>
          </div>
        ) : null}

        <p className={styles.failed} aria-live="assertive" hidden={failedMessage === undefined}>
          <FieldIcon name="alert" />
          {failedMessage ?? ""}
        </p>

        {viewer?.kind === "guest" ? (
          <BotCheck onToken={setBotToken} resetKey={botResetKey} />
        ) : null}

        <p className={styles.footerNote}>
          {text.footerNote.text}
          <Link className={styles.footerLink} href="/privacy">
            {text.footerNote.link}
          </Link>
        </p>
      </main>

      {limitResetAt !== undefined ? (
        <LimitPopup
          resetAt={limitResetAt}
          onClose={() => {
            setLimitResetAt(undefined);
            scanButton.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}
