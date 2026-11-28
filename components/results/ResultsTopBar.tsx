"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UsageResponse } from "../../lib/api/shared";
import { errorMessage, getContent } from "../../lib/content";
import { resultsFeedbackPage } from "../../lib/feedback";
import { saveScanFileInfo } from "../../lib/scan/scan-file-info";
import { rememberScanType } from "../../lib/scan/scan-type";
import {
  UPLOAD_PATH,
  fetchViewer,
  rescanCv,
  uploadOutcome,
  viewerFrom,
  type ScanType,
  type Viewer,
} from "../../lib/scan/upload";
import { fetchUsage } from "../../lib/scan/usage";
import { AppTopBar } from "../app/AppTopBar";
import { FieldIcon } from "../icons/FieldIcon";
import { LimitPopup } from "../scan/LimitPopup";
import uploadStyles from "../scan/upload.module.css";
import { FeedbackPopup } from "./FeedbackPopup";
import { MoreMenu } from "./MoreMenu";
import { RescorePopup, type RescoreStarted } from "./RescorePopup";
import styles from "./rescore.module.css";

type Notice = { kind: "working" } | { kind: "error"; message: string; offerUpload: boolean };

/**
 * The results top bar (B3 and C1): the General / Job-specific switch after the logo and Re-score
 * before the avatar (Build Plan Phase 3, PRD FR-28). Moving to General scans the CV from these
 * results again at once, by its scan_session_id, with no upload. Moving to Job-specific needs a
 * job description first, so it opens the B6 popup on Job-specific. Each is a new scan and goes
 * through the processing screen. The session is asked once, on load (AGENTS.md section 5), and
 * the usage once, the first time it is needed.
 */
export function ResultsTopBar({
  scanSessionId,
  scanType,
  score,
}: {
  scanSessionId: string;
  scanType: ScanType;
  /** The score as the page shows it, for the popup's chip. */
  score: string;
}) {
  const text = getContent("app/rescore").topBar;
  const upload = getContent("app/upload");
  const router = useRouter();
  const [viewer, setViewer] = useState<Viewer | undefined>(undefined);
  const [usage, setUsage] = useState<UsageResponse | undefined>(undefined);
  const [popupMode, setPopupMode] = useState<ScanType | undefined>(undefined);
  const [limit, setLimit] = useState<{ resetAt: string; scanType: ScanType } | undefined>(
    undefined,
  );
  const [notice, setNotice] = useState<Notice | undefined>(undefined);
  const usageAsked = useRef(false);
  const inFlight = useRef(false);
  // The button that opened a popup, so closing it puts focus back there. Kept here, not read
  // from the page's focus, because a click does not focus a button in every browser.
  const opener = useRef<HTMLButtonElement | null>(null);
  const moreButton = useRef<HTMLButtonElement | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  function closePopups() {
    setPopupMode(undefined);
    setLimit(undefined);
    opener.current?.focus();
  }

  useEffect(() => {
    let current = true;
    void fetchViewer().then((result) => {
      if (current) setViewer(viewerFrom(result));
    });
    return () => {
      current = false;
    };
  }, []);

  /** The usage, asked once. A failure leaves it unknown: the server still checks the limit. */
  async function knownUsage(): Promise<UsageResponse | undefined> {
    if (usage !== undefined || usageAsked.current) return usage;
    usageAsked.current = true;
    const answer = await fetchUsage();
    if (answer.kind !== "ok") return undefined;
    setUsage(answer.data);
    return answer.data;
  }

  /**
   * Opens B6 on a mode, or the A1 limit popup instead when a Free user has none of that mode's
   * scans left this month (B6 dev notes).
   */
  async function openOn(mode: ScanType) {
    const known = await knownUsage();
    const left =
      known === undefined ? null : known[mode === "general" ? "general" : "job_specific"];
    if (known !== undefined && left !== null && left.remaining === 0) {
      setPopupMode(undefined);
      setLimit({ resetAt: known.reset_at, scanType: mode });
      return;
    }
    setPopupMode(mode);
  }

  function started({ path, scanSessionId: newId, scanType: newType, file }: RescoreStarted) {
    rememberScanType(newId, newType);
    // The name and size only, for the line on the processing screen (lib/scan/scan-file-info).
    if (file !== undefined) saveScanFileInfo(newId, { name: file.name, size: file.size });
    router.push(path);
  }

  /** Job-specific to General: the same CV, scanned again at once. */
  async function switchToGeneral() {
    if (inFlight.current) return;
    inFlight.current = true;
    setNotice({ kind: "working" });
    const outcome = uploadOutcome(await rescanCv(scanSessionId, {}));
    inFlight.current = false;
    switch (outcome.kind) {
      case "processing":
        started({ ...outcome, scanType: "general", file: undefined });
        return;
      case "limit":
        setNotice(undefined);
        setLimit({ resetAt: outcome.resetAt, scanType: "general" });
        return;
      case "scanNotFound":
        setNotice({ kind: "error", message: outcome.message, offerUpload: true });
        return;
      case "failed":
        setNotice({ kind: "error", message: outcome.message, offerUpload: false });
        return;
      default:
        // Nothing else fits a scan sent by its id: the generic wording, with the upload page.
        setNotice({ kind: "error", message: errorMessage("internal_error"), offerUpload: true });
        return;
    }
  }

  function onSwitch(option: ScanType) {
    if (popupMode !== undefined) {
      // The popup is open: the top bar switch and the popup's switch are one (B6 dev notes).
      if (option !== popupMode) void openOn(option);
      return;
    }
    if (option === scanType || notice?.kind === "working") return;
    setNotice(undefined);
    if (option === "general") void switchToGeneral();
    else void openOn("smart_target");
  }

  const signedIn = viewer?.kind === "signedIn";
  // While the popup is open the switch shows its mode; Cancel puts back the page's own.
  const shownMode = popupMode ?? scanType;
  const working = notice?.kind === "working";

  const modeSwitch = signedIn ? (
    <div className={styles.modeSwitch} role="group" aria-label={text.modeSwitchLabel}>
      {(["general", "smart_target"] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={`${uploadStyles.switchOption} ${styles.modeOption} ${shownMode === option ? uploadStyles.switchSelected : ""}`}
          aria-pressed={shownMode === option}
          aria-busy={working && option === "general" ? true : undefined}
          onClick={(event) => {
            if (popupMode === undefined) opener.current = event.currentTarget;
            onSwitch(option);
          }}
        >
          <span>
            {option === "general" ? upload.modeSwitch.general : upload.modeSwitch.jobSpecific}
          </span>
        </button>
      ))}
    </div>
  ) : null;

  const rescore = signedIn ? (
    <button
      type="button"
      className={`${uploadStyles.switchOption} ${styles.rescore} ${popupMode !== undefined ? uploadStyles.switchSelected : ""}`}
      onClick={(event) => {
        opener.current = event.currentTarget;
        void openOn(scanType);
      }}
      disabled={working}
    >
      <span>{text.rescore}</span>
    </button>
  ) : null;

  // Re-score, then "..." before the avatar, as in the B8 top bar (Get PRO comes with billing).
  const accountSide = signedIn ? (
    <>
      {rescore}
      <MoreMenu button={moreButton} onFeedback={() => setFeedbackOpen(true)} />
    </>
  ) : null;

  return (
    <>
      <AppTopBar viewer={viewer} afterLogo={modeSwitch} beforeAccount={accountSide} />
      {notice !== undefined ? (
        <p
          className={`${styles.notice} ${notice.kind === "error" ? styles.noticeError : ""}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.kind === "working" ? (
            <>
              <FieldIcon name="loader" className={uploadStyles.spinner} />
              {text.switching}
            </>
          ) : (
            <>
              <FieldIcon name="alert" />
              {notice.message}
              {notice.offerUpload ? (
                <Link className={styles.uploadLink} href={UPLOAD_PATH}>
                  {text.uploadLink}
                </Link>
              ) : null}
            </>
          )}
        </p>
      ) : null}
      {popupMode !== undefined && viewer?.kind === "signedIn" ? (
        <RescorePopup
          pageType={scanType}
          scanSessionId={scanSessionId}
          score={score}
          mode={popupMode}
          onModeChange={(mode) => void openOn(mode)}
          careerLevel={viewer.user.career_level}
          usage={usage}
          onClose={closePopups}
          onStarted={started}
          onLimit={(resetAt, limitedType) => {
            setPopupMode(undefined);
            setLimit({ resetAt, scanType: limitedType });
          }}
        />
      ) : null}
      {limit !== undefined ? (
        <LimitPopup resetAt={limit.resetAt} scanType={limit.scanType} onClose={closePopups} />
      ) : null}
      {feedbackOpen && viewer?.kind === "signedIn" ? (
        <FeedbackPopup
          email={viewer.user.email}
          page={resultsFeedbackPage(scanType)}
          onClose={() => {
            setFeedbackOpen(false);
            moreButton.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}
