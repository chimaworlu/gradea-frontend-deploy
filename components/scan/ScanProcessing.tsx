"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ScanStatus } from "../../lib/api/shared";
import { LOGIN_PATH, problemMessage } from "../../lib/auth/forms";
import { fillPlaceholders, getContent } from "../../lib/content";
import { uploadedFileFor } from "../../lib/scan/last-upload";
import {
  getScanStatus,
  isTakingLonger,
  processingSteps,
  retryScan,
  statusView,
  type FailedReason,
  type StepState,
} from "../../lib/scan/status";
import { fileSizeLabel } from "../../lib/scan/upload";
import { AppTopBar } from "../app/AppTopBar";
import { ViewerTopBar } from "../app/ViewerTopBar";
import { FieldIcon } from "../icons/FieldIcon";
import { ScanErrorView } from "./ScanErrorView";
import { SessionExpired } from "./SessionExpired";
import styles from "./scan.module.css";

type View =
  | { kind: "processing"; status: ScanStatus }
  | { kind: "failed"; reason: FailedReason }
  | { kind: "expired" };

/**
 * B1 Processing for one scan, B2 when it fails, D1 when it is gone. The status is asked with
 * the server's retry_after and never faster, paused while the tab is hidden, and stopped once
 * the scan is done or failed (SRS Section 4, AGENTS.md section 5). Done goes to the results.
 */
export function ScanProcessing({ scanSessionId }: { scanSessionId: string }) {
  const text = getContent("app/processing");
  const errors = getContent("shared/errors");
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "processing", status: "waiting" });
  const [takingLonger, setTakingLonger] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | undefined>(undefined);
  // A new round of checks after "Try again"; its start time drives "taking longer".
  const [round, setRound] = useState(0);
  const file = uploadedFileFor(scanSessionId);

  useEffect(() => {
    const startedAt = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let paused = false;
    let nextDelay = 0;

    const schedule = (delayMs: number) => {
      nextDelay = delayMs;
      // A hidden tab asks nothing; it carries on when it is shown again.
      if (document.hidden) {
        paused = true;
        return;
      }
      timer = setTimeout(() => void check(), delayMs);
    };

    const check = async () => {
      timer = undefined;
      const result = await getScanStatus(scanSessionId);
      if (stopped) return;
      const elapsed = (Date.now() - startedAt) / 1000;
      const next = statusView(result, scanSessionId, elapsed);
      setTakingLonger(isTakingLonger(elapsed));
      switch (next.kind) {
        case "polling":
          setView({ kind: "processing", status: next.status });
          schedule(next.delayMs);
          return;
        case "retryLater":
          schedule(next.delayMs);
          return;
        case "done":
          setView({ kind: "processing", status: "done" });
          router.replace(next.path);
          return;
        case "failed":
          setView({ kind: "failed", reason: next.reason });
          return;
        case "expired":
          setView({ kind: "expired" });
          return;
        case "signedOut":
          window.location.assign(LOGIN_PATH);
          return;
      }
    };

    const onVisibility = () => {
      if (!document.hidden && paused) {
        paused = false;
        timer = setTimeout(() => void check(), nextDelay);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    void check();
    return () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [scanSessionId, round, router]);

  async function tryAgain() {
    if (retrying) return;
    setRetrying(true);
    setRetryError(undefined);
    const result = await retryScan(scanSessionId);
    setRetrying(false);
    if (result.kind === "ok") {
      setTakingLonger(false);
      setView({ kind: "processing", status: result.data.status });
      setRound((value) => value + 1);
      return;
    }
    if (result.kind === "error" && result.code === "scan_limit_reached") {
      setView({ kind: "failed", reason: "scan_limit_reached" });
      return;
    }
    if (result.kind === "error" && result.code === "not_found") {
      setView({ kind: "expired" });
      return;
    }
    setRetryError(result.kind === "network" ? errors.network : problemMessage(result.code));
  }

  if (view.kind === "expired") {
    return (
      <div className={styles.page}>
        {/* D1 shows the logo only. */}
        <AppTopBar viewer={undefined} />
        <SessionExpired />
      </div>
    );
  }

  if (view.kind === "failed") {
    return (
      <div className={styles.page}>
        <ViewerTopBar />
        <ScanErrorView
          reason={view.reason}
          file={file}
          onTryAgain={() => void tryAgain()}
          retrying={retrying}
          error={retryError}
        />
      </div>
    );
  }

  const steps = processingSteps(view.status);
  const rows: Array<{ key: keyof typeof steps; label: string }> = [
    { key: "reading", label: text.steps.reading },
    { key: "checking", label: text.steps.checking },
    { key: "preparing", label: text.steps.preparing },
  ];
  const fileSummary = getContent("app/upload").uploadBox.fileSummary;

  return (
    <div className={styles.page}>
      <ViewerTopBar />
      <main className={styles.main}>
        <h1 className={styles.heading}>{text.hero.heading}</h1>
        <p className={styles.subline}>{text.hero.subline}</p>
        <ol className={styles.steps} aria-label={text.steps.label} aria-live="polite">
          {rows.map(({ key, label }) => (
            <Step key={key} state={steps[key]} label={label} />
          ))}
        </ol>
        {file !== undefined ? (
          <p className={styles.file}>
            <FieldIcon name="file" />
            {fillPlaceholders(fileSummary, { name: file.name, size: fileSizeLabel(file.size) })}
          </p>
        ) : null}
        {takingLonger ? <p className={styles.note}>{text.takingLonger}</p> : null}
      </main>
    </div>
  );
}

function Step({ state, label }: { state: StepState; label: string }) {
  const text = getContent("app/processing").steps;
  const className = [
    styles.step,
    state === "current" ? styles.stepCurrent : "",
    state === "pending" ? styles.stepPending : "",
  ].join(" ");
  return (
    <li className={className} aria-current={state === "current" ? "step" : undefined}>
      <span className={styles.stepIcon}>
        {state === "done" ? <FieldIcon name="check" /> : null}
        {state === "current" ? <FieldIcon name="loader" className={styles.spinner} /> : null}
        {state === "pending" ? <FieldIcon name="circle" /> : null}
      </span>
      {label}
      {/* The step's state in words too, never the icon alone. */}
      <span className={styles.visuallyHidden}>
        {state === "done" ? text.done : state === "current" ? text.current : text.pending}
      </span>
    </li>
  );
}
