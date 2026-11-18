"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
// The root layout is replaced while this screen shows, so the tokens and base styles load here too.
import "../styles/tokens.css";
import "./globals.css";
import { AuthShell } from "../components/auth/AuthShell";
import styles from "../components/auth/form.module.css";
import { getContent } from "../lib/content";
import { inter, lora } from "./fonts";

/**
 * The last safety net: any error no page handled. Reports it to Sentry (only the error type and
 * stack, never the message, see lib/observability/sentry.ts) and shows the plain error wording
 * from content/shared/errors.json. Never a stack trace or a raw error string (coding-standards
 * Section 3).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const errors = getContent("shared/errors");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-GB" className={`${lora.variable} ${inter.variable}`}>
      <body>
        <AuthShell logoAlt={errors.screen.logoAlt}>
          <div className={styles.intro}>
            <h1 className={styles.heading}>{errors.screen.heading}</h1>
            <p className={styles.subline}>{errors.byCode.internal_error}</p>
          </div>
          <button type="button" className={styles.primary} onClick={() => window.location.reload()}>
            {errors.screen.retry}
          </button>
        </AuthShell>
      </body>
    </html>
  );
}
