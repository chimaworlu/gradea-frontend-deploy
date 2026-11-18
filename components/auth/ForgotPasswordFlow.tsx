"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { emailLooksValid, problemMessage } from "../../lib/auth/forms";
import { requestOutcome, requestReset, requestResetBody, secondsLeft } from "../../lib/auth/reset";
import { PASSWORD_RESET_RESEND_COOLDOWN_SECONDS } from "../../lib/config";
import { fillPlaceholders, getContent } from "../../lib/content";
import { resetLinkDuration } from "../../lib/password-reset";
import { BotCheck } from "./BotCheck";
import { FormError, FormIntro, SubmitButton, TextField } from "./FormPieces";
import styles from "./form.module.css";

const EMAIL_ID = "reset-email";

/**
 * A5 Request and Email sent. The API answers the same whether or not an account exists, so a
 * successful request always shows "Check your email" (A5 dev notes: never "no account found").
 * The email is kept in React state only, to show it back; it is never stored or logged.
 */
export function ForgotPasswordFlow() {
  const text = getContent("app/forgot-password");
  const errors = getContent("shared/errors");
  const [email, setEmail] = useState("");
  const [emailProblem, setEmailProblem] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [sentTo, setSentTo] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [resendNote, setResendNote] = useState<string | undefined>(undefined);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);
  const [botToken, setBotToken] = useState<string | undefined>(undefined);
  const [botResetKey, setBotResetKey] = useState(0);
  const inFlight = useRef(false);

  // Ticks once a second while "Send again" is waiting, for the countdown.
  useEffect(() => {
    if (cooldownUntil === 0) return undefined;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  /** Sends the request. Returns true when the API accepted it. */
  async function send(address: string): Promise<boolean> {
    inFlight.current = true;
    setSending(true);
    const outcome = requestOutcome(await requestReset(requestResetBody(address, botToken)));
    inFlight.current = false;
    setSending(false);
    // A bot token works once, so get a fresh one for the next send.
    setBotResetKey((key) => key + 1);
    if (outcome.kind === "sent") {
      const start = Date.now();
      setNow(start);
      setCooldownUntil(start + PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1000);
      return true;
    }
    const message = outcome.kind === "network" ? errors.network : problemMessage(outcome.code);
    if (sentTo === undefined) setFormError(message);
    else setResendNote(message);
    return false;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setFormError(undefined);
    if (!emailLooksValid(email)) {
      setEmailProblem(problemMessage("email_invalid"));
      document.getElementById(EMAIL_ID)?.focus();
      return;
    }
    const address = email.trim();
    if (await send(address)) setSentTo(address);
  }

  async function sendAgain() {
    if (inFlight.current || sentTo === undefined) return;
    setResendNote(undefined);
    if (await send(sentTo)) setResendNote(text.emailSent.resend.success);
  }

  const waiting = secondsLeft(cooldownUntil, now);

  if (sentTo !== undefined) {
    return (
      <>
        <FormIntro
          heading={text.emailSent.heading}
          subline={fillPlaceholders(text.emailSent.body, {
            email: sentTo,
            duration: resetLinkDuration(),
          })}
        />
        <div className={styles.actions}>
          <Link className={styles.primary} href="/login">
            {text.emailSent.backToLogIn}
          </Link>
          <p className={styles.centerNote}>
            {text.emailSent.resend.prompt}{" "}
            <button
              type="button"
              className={styles.inlineAction}
              onClick={sendAgain}
              disabled={sending || waiting > 0}
              aria-busy={sending ? true : undefined}
            >
              {sending
                ? text.emailSent.resend.loading
                : waiting > 0
                  ? fillPlaceholders(text.emailSent.resend.cooldown, { seconds: waiting })
                  : text.emailSent.resend.link}
            </button>
          </p>
          <p className={styles.centerNote} aria-live="polite">
            {resendNote ?? ""}
          </p>
        </div>
        <BotCheck onToken={setBotToken} resetKey={botResetKey} />
      </>
    );
  }

  return (
    <>
      <FormIntro heading={text.request.heading} subline={text.request.subline} />
      <form
        className={styles.form}
        onSubmit={submit}
        noValidate
        aria-describedby="reset-form-error"
      >
        <TextField
          id={EMAIL_ID}
          label={text.request.email.label}
          placeholder={text.request.email.placeholder}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onValueChange={(value) => {
            setEmail(value);
            setEmailProblem(undefined);
          }}
          error={emailProblem}
        />
        <BotCheck onToken={setBotToken} resetKey={botResetKey} />
        <FormError id="reset-form-error" message={formError} />
        <SubmitButton text={text.request.submit} loading={sending} />
      </form>
      <div className={styles.actions}>
        <Link className={styles.textAction} href="/login">
          {text.request.backToLogIn}
        </Link>
      </div>
    </>
  );
}
