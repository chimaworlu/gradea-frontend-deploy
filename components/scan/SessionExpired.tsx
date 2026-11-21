"use client";

import { useEffect } from "react";
import { getContent } from "../../lib/content";
import { UPLOAD_PATH } from "../../lib/scan/upload";
import { clearWaitingScan } from "../../lib/scan/waiting-scan";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./scan.module.css";

/**
 * D1 Guest session expired: the guest scan ran out (30 minutes, SRS Section 5) or is gone, so
 * the person starts again at A1. Any waiting scan kept in this tab is cleared.
 */
export function SessionExpired() {
  const text = getContent("app/session-expired");

  useEffect(() => {
    clearWaitingScan();
  }, []);

  return (
    <main className={styles.centred}>
      <div className={styles.card}>
        <span className={styles.clockIcon}>
          <FieldIcon name="clock" />
        </span>
        <h1 className={styles.cardHeading}>{text.heading}</h1>
        <p className={styles.cardBody}>{text.body}</p>
        <div className={styles.actions}>
          {/* A full page visit, so the upload page starts fresh. */}
          <a className={`${styles.primary} ${styles.wide}`} href={UPLOAD_PATH}>
            {text.action}
          </a>
        </div>
      </div>
    </main>
  );
}
