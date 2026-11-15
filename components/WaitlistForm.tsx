"use client";

import Script from "next/script";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { getConfig, getTurnstileSiteKey } from "../lib/config";
import { TURNSTILE_SCRIPT_URL, createTurnstileTokenGetter } from "../lib/turnstile";
import { trackWaitlistOutcome } from "../lib/analytics";
import {
  WAITLIST_SOURCE,
  createSingleFlight,
  submitWaitlist,
  type WaitlistOutcome,
} from "../lib/waitlist";
import { CheckIcon } from "./icons/SocialIcon";
import styles from "./WaitlistForm.module.css";

export type WaitlistFormText = {
  default: { label: string; placeholder: string; button: string };
  sending: { button: string };
  joined: { title: string; body: string };
  error: { invalidEmail: string; rateLimited: string; generic: string };
};

type ErrorKind = Exclude<WaitlistOutcome, "joined">;

function errorText(kind: ErrorKind, text: WaitlistFormText["error"]): string {
  switch (kind) {
    case "invalid_email":
      return text.invalidEmail;
    case "rate_limited":
      return text.rateLimited;
    case "error":
      return text.generic;
  }
}

/**
 * G12 waitlist form (FR-55, FR-56). States: default, filled (the same form with text in it),
 * sending (button locked), joined and error. A repeat email shows joined, because the
 * endpoint answers a repeat the same way as a new email.
 */
export function WaitlistForm({ text }: { text: WaitlistFormText }) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const joinedRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<ErrorKind | null>(null);

  const turnstileSiteKey = useMemo(() => getTurnstileSiteKey(), []);
  // Created on the first submit (refs are only read in event handlers, never during render).
  const botTokenGetterRef = useRef<(() => Promise<string>) | null>(null);
  // A second tap or Enter while a request is running does nothing.
  const singleFlight = useMemo(() => createSingleFlight<WaitlistOutcome>(), []);

  // The form is replaced by the joined message, so focus moves to it once it is on the page.
  useEffect(() => {
    if (joined) {
      joinedRef.current?.focus();
    }
  }, [joined]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const outcome = await singleFlight(async () => {
      setSending(true);
      try {
        return await submitWaitlist({
          rawEmail: email,
          getApiUrl: () => getConfig().apiUrl,
          turnstileSiteKey,
          getBotToken: () => {
            botTokenGetterRef.current ??= createTurnstileTokenGetter(
              turnstileSiteKey,
              turnstileRef,
            );
            return botTokenGetterRef.current();
          },
          fetchFn: (input, init) => fetch(input, init),
        });
      } finally {
        setSending(false);
      }
    });
    if (outcome === undefined) {
      return;
    }
    // Sends waitlist_submitted (source only, never the email) when the join succeeded.
    trackWaitlistOutcome(outcome, WAITLIST_SOURCE);
    if (outcome === "joined") {
      setError(null);
      setJoined(true);
      return;
    }
    setError(outcome);
    inputRef.current?.focus();
  }

  return (
    <>
      {turnstileSiteKey !== "" && <Script src={TURNSTILE_SCRIPT_URL} strategy="afterInteractive" />}

      <div aria-live="polite">
        {joined && (
          <div ref={joinedRef} className={styles.joined} tabIndex={-1}>
            <span className={styles.joinedIcon}>
              <CheckIcon />
            </span>
            <div className={styles.joinedText}>
              <p className={styles.joinedTitle}>{text.joined.title}</p>
              <p className={styles.joinedBody}>{text.joined.body}</p>
            </div>
          </div>
        )}
      </div>

      {!joined && (
        // method="post" so that, even before the script loads, the email never lands in a URL.
        <form className={styles.form} method="post" noValidate onSubmit={onSubmit}>
          <div className={styles.row}>
            <label htmlFor={inputId} className={styles.visuallyHidden}>
              {text.default.label}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder={text.default.placeholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error !== null}
              aria-describedby={errorId}
            />
            <button className={styles.button} type="submit" disabled={sending} aria-busy={sending}>
              {sending ? text.sending.button : text.default.button}
            </button>
          </div>
          <p id={errorId} className={styles.error} aria-live="polite">
            {error !== null ? errorText(error, text.error) : null}
          </p>
          <div ref={turnstileRef} className={styles.turnstile} />
        </form>
      )}
    </>
  );
}
