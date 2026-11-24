"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  PassedCheck,
  ScanResultResponse,
  ScanType,
  ScoreCategory,
} from "../../lib/api/shared";
import { LOGIN_PATH, problemMessage } from "../../lib/auth/forms";
import {
  fillPlaceholders,
  getContent,
  fileIssueLabel,
  passedCheckLabel,
  scoreCategoryLabel,
} from "../../lib/content";
import {
  LINES_SHOWN_FIRST,
  categoryRows,
  cvPanelNote,
  getScanResult,
  issuesLabel,
  lineMeta,
  openLines,
  resultScanType,
  resultView,
  retryLineDetail,
  type CategoryRow,
  type ScoredJobResult,
} from "../../lib/scan/result";
import { knownScanType, rememberScanType } from "../../lib/scan/scan-type";
import { isTakingLonger } from "../../lib/scan/status";
import { readScanFileInfo, type ScanFileInfo } from "../../lib/scan/scan-file-info";
import { UPLOAD_PATH } from "../../lib/scan/upload";
import { AppTopBar } from "../app/AppTopBar";
import { ViewerTopBar } from "../app/ViewerTopBar";
import { FieldIcon } from "../icons/FieldIcon";
import { ProcessingMain } from "../scan/ScanProcessing";
import { SessionExpired } from "../scan/SessionExpired";
import scanStyles from "../scan/scan.module.css";
import { CvPage, cvLineId } from "./CvPage";
import { JobResults } from "./JobResults";
import { ScoreRing } from "./ScoreRing";
import styles from "./results.module.css";

type View =
  | { kind: "preparing" }
  | { kind: "ready"; result: ScanResultResponse }
  | { kind: "jobReady"; result: ScoredJobResult }
  | { kind: "detailsFailed" }
  | { kind: "expired" };

/**
 * B3 Results for one scan, or C1 when the result is Job-specific (Build Plan Phases 2 and 3, PRD
 * Sections 12.1 and 12.2). The result is asked once, and again only while line detail runs, waiting the server's retry_after (never under 2 seconds,
 * paused while the tab is hidden). Until line detail is done the page keeps the processing
 * look, so the scores shown never change in front of the person.
 */
export function ResultsScreen({ scanSessionId }: { scanSessionId: string }) {
  const errors = getContent("shared/errors");
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "preparing" });
  const [scanType, setScanType] = useState<ScanType | undefined>(() =>
    knownScanType(scanSessionId),
  );
  const [takingLonger, setTakingLonger] = useState(false);
  const [file, setFile] = useState<ScanFileInfo | undefined>(undefined);
  const [round, setRound] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const startedAt = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let paused = false;
    let nextDelay = 0;
    let fileRead = false;

    const schedule = (delayMs: number) => {
      nextDelay = delayMs;
      if (document.hidden) {
        paused = true;
        return;
      }
      timer = setTimeout(() => void check(), delayMs);
    };

    const check = async () => {
      timer = undefined;
      const answer = await getScanResult(scanSessionId);
      if (stopped) return;
      if (!fileRead) {
        fileRead = true;
        const kept = readScanFileInfo(scanSessionId);
        if (kept !== undefined) setFile(kept);
      }
      setTakingLonger(isTakingLonger((Date.now() - startedAt) / 1000));
      if (answer.kind === "ok") {
        const type = resultScanType(answer.data);
        rememberScanType(scanSessionId, type);
        setScanType(type);
      }
      const next = resultView(answer, scanSessionId);
      switch (next.kind) {
        case "ready":
          setView({ kind: "ready", result: next.result });
          return;
        case "jobReady":
          setView({ kind: "jobReady", result: next.result });
          return;
        case "preparing":
          setView({ kind: "preparing" });
          schedule(next.delayMs);
          return;
        case "retryLater":
          schedule(next.delayMs);
          return;
        case "detailsFailed":
          setView({ kind: "detailsFailed" });
          return;
        case "notScored":
          router.replace(next.path);
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
    const answer = await retryLineDetail(scanSessionId);
    setRetrying(false);
    if (answer.kind === "ok") {
      setView({ kind: "preparing" });
      setRound((value) => value + 1);
      return;
    }
    setRetryError(answer.kind === "network" ? errors.network : problemMessage(answer.code));
  }

  if (view.kind === "expired") {
    return (
      <div className={scanStyles.page}>
        <AppTopBar viewer={undefined} />
        <SessionExpired />
      </div>
    );
  }

  if (view.kind === "preparing") {
    return (
      <div className={scanStyles.page}>
        <ViewerTopBar />
        <ProcessingMain status="done" scanType={scanType} file={file} takingLonger={takingLonger} />
      </div>
    );
  }

  if (view.kind === "detailsFailed") {
    return (
      <div className={styles.page}>
        <ViewerTopBar />
        <DetailsFailed onTryAgain={() => void tryAgain()} retrying={retrying} error={retryError} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ViewerTopBar />
      {view.kind === "jobReady" ? (
        <JobResults result={view.result} />
      ) : (
        <Results result={view.result} />
      )}
    </div>
  );
}

/**
 * "Details failed": line detail failed after its retry. No score shows yet, because the scores
 * are recomputed when line detail ends (PRD 12.1); Try again runs only the failed categories.
 */
function DetailsFailed({
  onTryAgain,
  retrying,
  error,
}: {
  onTryAgain: () => void;
  retrying: boolean;
  error: string | undefined;
}) {
  const text = getContent("app/results").middleDetail.detailsFailed;
  return (
    <main className={styles.failedMain}>
      <span className={styles.errorIcon}>
        <FieldIcon name="alert" />
      </span>
      <h1 className={styles.errorHeading}>{text.heading}</h1>
      <p className={styles.detailBody}>{text.body}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={onTryAgain}
          disabled={retrying}
          aria-busy={retrying ? true : undefined}
        >
          {retrying ? text.tryAgain.loading : text.tryAgain.default}
        </button>
        <Link className={styles.textLink} href={UPLOAD_PATH}>
          {text.uploadAnother}
        </Link>
      </div>
      <p className={styles.formError} role="alert">
        {error ?? ""}
      </p>
    </main>
  );
}

/** The rail and the selected category, once line detail is done. */
export function Results({ result }: { result: ScanResultResponse }) {
  const rows = categoryRows(result);
  const opened = result.line_detail.category ?? rows[0]?.category;
  const [selected, setSelected] = useState<ScoreCategory | undefined>(opened);
  const current = rows.find((row) => row.category === selected) ?? rows[0];
  // The flagged line picked from a card, highlighted and scrolled to in the CV panel.
  const [activeLine, setActiveLine] = useState<string | undefined>(undefined);

  // Scrolls the CV panel to the picked line (instant with reduced motion).
  useEffect(() => {
    if (activeLine === undefined) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(cvLineId(activeLine))
      ?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [activeLine]);

  return (
    <div className={styles.layout}>
      {/* The rail and the middle panel scroll together; the CV panel scrolls on its own. */}
      <div className={styles.mainColumns}>
        <Rail
          overallScore={result.overall_score ?? 0}
          rows={rows}
          selected={current?.category}
          onSelect={(category) => {
            setSelected(category);
            setActiveLine(undefined);
          }}
        />
        {current !== undefined ? (
          <CategoryDetail
            key={current.category}
            row={current}
            result={result}
            activeLine={activeLine}
            onLineSelect={setActiveLine}
          />
        ) : null}
      </div>
      {current !== undefined ? (
        <CvPanel result={result} row={current} activeLine={activeLine} />
      ) : null}
    </div>
  );
}

function Rail({
  overallScore,
  rows,
  selected,
  onSelect,
}: {
  overallScore: number;
  rows: CategoryRow[];
  selected: ScoreCategory | undefined;
  onSelect: (category: ScoreCategory) => void;
}) {
  const text = getContent("app/results").leftRail;
  return (
    <aside className={styles.rail}>
      <div className={styles.overall}>
        <ScoreRing
          score={overallScore}
          shown={String(overallScore)}
          label={fillPlaceholders(text.scoreOutOf, { score: overallScore })}
        />
        <p className={styles.overallLabel}>{text.overallScore}</p>
      </div>
      <ul className={styles.categories} aria-label={text.categoriesLabel}>
        {rows.map((row) => (
          <li key={row.category}>
            <button
              type="button"
              className={styles.categoryCard}
              aria-current={row.category === selected ? "true" : undefined}
              onClick={() => onSelect(row.category)}
            >
              <span className={styles.categoryName}>{scoreCategoryLabel(row.category)}</span>
              <span className={styles.categoryMeta}>
                <span>
                  {row.score} ·{" "}
                  {row.state === "noIssues" ? text.noIssues : issuesLabel(row.flaggedCount)}
                </span>
                {row.state === "locked" ? (
                  <span className={styles.proTag}>
                    <FieldIcon name="lock" />
                    <span aria-hidden="true">{text.pro}</span>
                    <span className={scanStyles.visuallyHidden}>{text.proLabel}</span>
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {/* "Try AutoFix free" and Magic Write come with their features (Build Plan Phase 4). */}
    </aside>
  );
}

function CategoryDetail({
  row,
  result,
  activeLine,
  onLineSelect,
}: {
  row: CategoryRow;
  result: ScanResultResponse;
  activeLine: string | undefined;
  onLineSelect: (lineId: string) => void;
}) {
  const text = getContent("app/results").middleDetail;
  const [showAll, setShowAll] = useState(false);
  const lines = row.state === "open" ? openLines(result) : [];
  const shown = showAll ? lines : lines.slice(0, LINES_SHOWN_FIRST);
  const hidden = lines.length - shown.length;
  // ATS issues in the file itself, only when ATS & Formatting is the open category. They never
  // change a count here: the server's flagged_count is shown as it is, and thin_cv is not in it.
  const fileIssues =
    row.category === "ats_formatting" && row.category === result.line_detail.category
      ? result.line_detail.file_issues
      : [];
  // The same card as a flagged line, with the issue's label and the server's reason. Not a
  // button, as there is no CV line to highlight.
  const fileIssueCards = fileIssues.map((item) => (
    <li key={item.issue} className={styles.lineCard}>
      <span className={styles.lineSection}>{fileIssueLabel(item.issue)}</span>
      <span className={styles.lineReason}>{item.reason}</span>
    </li>
  ));

  return (
    <section className={styles.detail} aria-labelledby="category-heading">
      <h1 id="category-heading" className={styles.detailHeading}>
        {scoreCategoryLabel(row.category)}
      </h1>
      <p className={styles.detailSummary}>
        {fillPlaceholders(text.summary, { score: row.score })} ·{" "}
        {row.state === "noIssues"
          ? getContent("app/results").leftRail.noIssues
          : issuesLabel(row.flaggedCount)}
      </p>

      {/* The open category's one-sentence summary, from line detail, when the server kept one. */}
      {row.state === "open" && result.line_detail.summary !== null ? (
        <p className={styles.detailBody}>{result.line_detail.summary}</p>
      ) : null}

      {/* No counted issue, but the file can still carry a message (thin_cv): its card shows in
          place of "Nothing in this category needs work". */}
      {row.state === "noIssues" && fileIssues.length === 0 ? (
        <p className={styles.detailBody}>{text.noIssues.body}</p>
      ) : null}
      {row.state === "noIssues" && fileIssues.length > 0 ? (
        <ul className={styles.lines}>{fileIssueCards}</ul>
      ) : null}

      {row.state === "locked" ? (
        <>
          <p className={styles.detailBody}>
            {fillPlaceholders(
              row.flaggedCount === 1 ? text.locked.body.one : text.locked.body.other,
              {
                count: row.flaggedCount,
              },
            )}
          </p>
          <h2 className={styles.sectionTitle}>
            {text.flaggedLines}
            <span className={styles.proTag}>
              <FieldIcon name="lock" />
              {getContent("app/results").leftRail.pro}
            </span>
          </h2>
          <ul className={styles.lines} aria-hidden="true">
            {Array.from({ length: Math.min(row.flaggedCount, LINES_SHOWN_FIRST) }, (_, index) => (
              <li key={index} className={styles.lockedCard}>
                <span className={styles.lockedBar} />
                <span className={styles.lockedBar} />
                <span className={styles.lockedBar} />
                <span className={styles.lockedIcon}>
                  <FieldIcon name="lock" />
                </span>
              </li>
            ))}
          </ul>
          {/* "Unlock with PRO" and its price go here once the plans endpoint exists: the price
              must come from the server, never typed in (as in the limit popup). */}
        </>
      ) : null}

      {row.state === "open" ? (
        <>
          <h2 className={styles.sectionTitle}>{text.flaggedLines}</h2>
          <ul className={styles.lines}>
            {shown.map((line) => (
              <li key={line.line_id}>
                {/* The whole card picks the line: the CV panel scrolls to it and highlights it. */}
                <button
                  type="button"
                  className={styles.lineCard}
                  aria-pressed={activeLine === line.line_id}
                  aria-describedby="show-on-cv"
                  onClick={() => onLineSelect(line.line_id)}
                >
                  <span className={styles.lineSection}>{lineMeta(line)}</span>
                  <span className={styles.lineText}>{line.text}</span>
                  <span className={styles.lineReason}>{line.reason}</span>
                </button>
                {/* "AutoFix this line" comes with AutoFix (Build Plan Phase 4). */}
              </li>
            ))}
            {fileIssueCards}
          </ul>
          <span id="show-on-cv" className={scanStyles.visuallyHidden}>
            {text.showOnCv}
          </span>
          {hidden > 0 ? (
            <button type="button" className={styles.showMore} onClick={() => setShowAll(true)}>
              {fillPlaceholders(text.showMore, { count: hidden })}
            </button>
          ) : null}
          <PassedChecks checks={result.passed_checks} />
        </>
      ) : null}
    </section>
  );
}

/** "Passed checks": the checks the server verified in code, hidden when there are none. */
export function PassedChecks({ checks }: { checks: readonly PassedCheck[] }) {
  if (checks.length === 0) return null;
  const text = getContent("app/results").middleDetail.passedChecks;
  return (
    <>
      <h2 className={styles.sectionTitle}>{text.heading}</h2>
      <ul className={styles.passedChecks}>
        {checks.map((check) => (
          <li key={check} className={styles.passedCheck}>
            {/* Green means passed; the words say it too (design-system-rules section 2). */}
            <span className={styles.passedIcon}>
              <FieldIcon name="check" />
            </span>
            {passedCheckLabel(check)}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * The CV panel: the whole CV from result.cv, section by section. Only when the open category is
 * selected are its flagged lines highlighted; a locked or clean category marks nothing (the
 * server never marks a locked category's lines either).
 */
export function CvPanel({
  result,
  row,
  activeLine,
}: {
  result: ScanResultResponse;
  row: CategoryRow;
  activeLine: string | undefined;
}) {
  const text = getContent("app/results").cvPanel;
  if (result.cv.length === 0) return null;
  const note = cvPanelNote(row.state, scoreCategoryLabel(row.category));
  const marking = row.state === "open";
  return (
    <section className={styles.cvPanel} aria-label={text.label}>
      {note !== undefined ? (
        <p className={styles.cvNote} data-kind={note.kind}>
          <FieldIcon name={note.kind === "flagged" ? "flag" : "lock"} />
          {note.text}
        </p>
      ) : null}
      <CvPage cv={result.cv} marking={marking} activeLine={activeLine} />
    </section>
  );
}
