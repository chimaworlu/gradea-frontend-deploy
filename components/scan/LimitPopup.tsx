"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { fillPlaceholders, getContent } from "../../lib/content";
import { resetDateLabel } from "../../lib/scan/upload";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./upload.module.css";

/**
 * E7 Limit reached ("A1 / Upload / Free / Limit reached"). Shown only when POST
 * /api/scan/general answers scan_limit_reached, with the reset date from its reset_at in Lagos
 * time (SRS Section 7). A dim layer covers the page, focus moves in and stays in, and Escape or
 * the close button closes it; the page puts focus back on "Scan my CV" (A1 dev notes).
 */
export function LimitPopup({ resetAt, onClose }: { resetAt: string; onClose: () => void }) {
  const text = getContent("app/upload").popups.limitReached;
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      // The close button is the only control for now, so focus stays on it.
      event.preventDefault();
      closeButton.current?.focus();
    }
  }

  return (
    <div className={styles.scrim} onKeyDown={onKeyDown}>
      <div
        className={styles.popup}
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-popup-title"
        aria-describedby="limit-popup-body"
      >
        <h2 id="limit-popup-title" className={styles.popupTitle}>
          {text.title}
        </h2>
        <p id="limit-popup-body" className={styles.popupBody}>
          {fillPlaceholders(text.body, { date: resetDateLabel(resetAt) })}
        </p>
        {/* The Day Pass price line, "See PRO plans" and "Maybe later" go here once the plans
            endpoint exists: the price must come from the server, never typed in (A1 dev notes). */}
        <button
          ref={closeButton}
          type="button"
          className={styles.popupClose}
          onClick={onClose}
          aria-label={text.close}
        >
          <FieldIcon name="close" />
        </button>
      </div>
    </div>
  );
}
