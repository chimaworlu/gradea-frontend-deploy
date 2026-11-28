"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { FeedbackPage } from "../../lib/api/shared";
import { FEEDBACK_MESSAGE_MAX_LENGTH } from "../../lib/config";
import { getContent } from "../../lib/content";
import { feedbackOutcome, hasFeedbackText, sendFeedback } from "../../lib/feedback";
import { FieldIcon } from "../icons/FieldIcon";
import uploadStyles from "../scan/upload.module.css";
import styles from "./more.module.css";

const FOCUSABLE = "button:not([disabled]), textarea, a[href], [tabindex]:not([tabindex='-1'])";

/**
 * D4 Feedback form, from More > Feedback (Build Plan Phase 3, D4 dev notes): Empty, Filled,
 * Sending, a failed send and Thanks in one popup that never moves. The message lives in this
 * popup's memory only and goes out in the one request: never stored, logged, put in the address
 * or in an analytics event. The email is the signed-in account's, shown to its owner only.
 */
export function FeedbackPopup({
  email,
  page,
  onClose,
  initiallySent = false,
}: {
  email: string;
  page: FeedbackPage;
  onClose: () => void;
  /** Opens on the Thanks state; for rendering that state on its own in tests. */
  initiallySent?: boolean;
}) {
  const text = getContent("app/feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [sent, setSent] = useState(initiallySent);
  const dialog = useRef<HTMLDivElement>(null);
  const messageBox = useRef<HTMLTextAreaElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // A ref as well as state, so a double click never sends twice.
  const inFlight = useRef(false);

  // Focus goes to the box on open, and to Close once sent. The page puts it back on "..."
  // when the popup closes.
  useEffect(() => {
    if (sent) closeButton.current?.focus();
    else messageBox.current?.focus();
  }, [sent]);

  const canSend = hasFeedbackText(message) && !sending;

  async function send() {
    if (inFlight.current || !hasFeedbackText(message)) return;
    inFlight.current = true;
    setSending(true);
    setError(undefined);
    const outcome = feedbackOutcome(await sendFeedback(message, page));
    inFlight.current = false;
    setSending(false);
    if (outcome.kind === "sent") {
      setMessage("");
      setSent(true);
      return;
    }
    // The text stays in the box, so it can be sent again.
    setError(outcome.message);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!sending) onClose();
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

  return (
    <div className={uploadStyles.scrim} onKeyDown={onKeyDown}>
      <div
        ref={dialog}
        className={`${uploadStyles.popup} ${styles.popup}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
      >
        {sent ? (
          <>
            <span className={styles.thanksIcon}>
              <FieldIcon name="circleCheck" />
            </span>
            <h2 id="feedback-title" className={styles.thanksTitle}>
              {text.thanks.title}
            </h2>
            <p className={styles.line} role="status">
              {text.thanks.line}
            </p>
            <button
              ref={closeButton}
              type="button"
              className={`${uploadStyles.primary} ${styles.close}`}
              onClick={onClose}
            >
              {text.thanks.close}
            </button>
          </>
        ) : (
          <>
            <h2 id="feedback-title" className={styles.title}>
              {text.form.title}
            </h2>
            <button
              type="button"
              className={uploadStyles.popupClose}
              onClick={onClose}
              disabled={sending}
              aria-label={text.form.close}
            >
              <FieldIcon name="close" />
            </button>
            <p className={styles.line}>{text.form.line}</p>
            <label className={styles.label} htmlFor="feedback-message">
              {text.form.label}
            </label>
            <textarea
              ref={messageBox}
              id="feedback-message"
              className={styles.message}
              placeholder={text.form.placeholder}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setError(undefined);
              }}
              maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
              rows={4}
              readOnly={sending}
              autoComplete="off"
              aria-invalid={error === undefined ? undefined : true}
              aria-describedby={error === undefined ? undefined : "feedback-error"}
            />
            <p className={styles.reply}>
              <span className={styles.replyLabel}>{text.form.replyTo}</span>
              <span className={styles.replyEmail}>{email}</span>
            </p>
            <p className={styles.replyNote}>{text.form.replyNote}</p>
            <p
              id="feedback-error"
              className={`${uploadStyles.failed} ${styles.error}`}
              role="alert"
              hidden={error === undefined}
            >
              <FieldIcon name="alert" />
              {error ?? ""}
            </p>
            <div className={styles.buttons}>
              <button
                type="button"
                className={uploadStyles.textButton}
                onClick={onClose}
                disabled={sending}
              >
                {text.form.cancel}
              </button>
              <button
                type="button"
                className={`${uploadStyles.primary} ${styles.send}`}
                onClick={() => void send()}
                disabled={!canSend}
                aria-busy={sending ? true : undefined}
              >
                {sending ? (
                  <>
                    <FieldIcon name="loader" className={uploadStyles.spinner} />
                    {text.form.send.loading}
                  </>
                ) : (
                  text.form.send.default
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
