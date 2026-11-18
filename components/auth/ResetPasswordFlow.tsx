"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { problemMessage, type ClientProblem } from "../../lib/auth/forms";
import {
  addressWithoutToken,
  checkNewPassword,
  completeOutcome,
  completeReset,
  completeResetBody,
  readResetToken,
} from "../../lib/auth/reset";
import { fillPlaceholders, getContent } from "../../lib/content";
import { resetLinkDuration } from "../../lib/password-reset";
import { FieldIcon } from "../icons/FieldIcon";
import { FormError, FormIntro, PasswordField, SubmitButton } from "./FormPieces";
import styles from "./form.module.css";

const PASSWORD_ID = "new-password";
const CONFIRM_ID = "confirm-new-password";

type Step = "reading" | "form" | "expired" | "success";

/**
 * Reads the reset token once and takes it out of the address bar straight away, so it does
 * not stay in the URL, the history, a bookmark or a screenshot. The token then lives only in
 * memory. Returns undefined until the address has been read.
 */
function useResetToken(): { read: boolean; token: string | undefined } {
  const [state, setState] = useState<{ read: boolean; token: string | undefined }>({
    read: false,
    token: undefined,
  });
  // React runs effects twice in development; the first run has already removed the token.
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const { pathname, search, hash } = window.location;
    const token = readResetToken(search);
    if (token !== undefined) {
      window.history.replaceState(
        window.history.state,
        "",
        addressWithoutToken(pathname, search, hash),
      );
    }
    // A microtask keeps the state change out of the effect body (react-hooks rules).
    queueMicrotask(() => setState({ read: true, token }));
  }, []);

  return state;
}

/** A5 New password, Success and Link expired. */
export function ResetPasswordFlow() {
  const text = getContent("app/forgot-password");
  const errors = getContent("shared/errors");
  const { read, token } = useResetToken();
  const [finished, setFinished] = useState<"success" | "expired" | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordProblem, setPasswordProblem] = useState<ClientProblem | undefined>(undefined);
  const [mismatch, setMismatch] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const step: Step = !read ? "reading" : (finished ?? (token === undefined ? "expired" : "form"));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || token === undefined) return;
    setFormError(undefined);

    const found = checkNewPassword(password, confirm);
    setPasswordProblem(found.password);
    setMismatch(found.confirm !== undefined);
    if (found.password !== undefined || found.confirm !== undefined) {
      document.getElementById(found.password !== undefined ? PASSWORD_ID : CONFIRM_ID)?.focus();
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    const outcome = completeOutcome(await completeReset(completeResetBody(token, password)));
    inFlight.current = false;
    setSubmitting(false);

    switch (outcome.kind) {
      case "success":
      case "expired":
        setFinished(outcome.kind);
        return;
      case "password":
        setPasswordProblem(outcome.code);
        document.getElementById(PASSWORD_ID)?.focus();
        return;
      case "form":
        setFormError(problemMessage(outcome.code));
        return;
      case "network":
        setFormError(errors.network);
        return;
    }
  }

  if (step === "reading") return null;

  if (step === "success") {
    return (
      <>
        <FieldIcon name="circleCheck" className={styles.successIcon} />
        {/* The API does not log the person in after a reset (A5 dev notes). */}
        <FormIntro heading={text.success.heading} subline={text.success.body} />
        <Link className={styles.primary} href="/login">
          {text.success.logIn}
        </Link>
      </>
    );
  }

  if (step === "expired") {
    return (
      <>
        <FormIntro
          heading={text.linkExpired.heading}
          subline={fillPlaceholders(text.linkExpired.body, { duration: resetLinkDuration() })}
        />
        <div className={styles.actions}>
          <Link className={styles.primary} href="/forgot-password">
            {text.linkExpired.sendNewLink}
          </Link>
          <Link className={styles.textAction} href="/login">
            {text.linkExpired.backToLogIn}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <FormIntro heading={text.newPassword.heading} subline={text.newPassword.subline} />
      <form
        className={styles.form}
        onSubmit={submit}
        noValidate
        aria-describedby="new-password-error"
      >
        <PasswordField
          id={PASSWORD_ID}
          label={text.newPassword.password.label}
          placeholder={text.newPassword.password.placeholder}
          autoComplete="new-password"
          value={password}
          onValueChange={(value) => {
            setPassword(value);
            setPasswordProblem(undefined);
          }}
          error={passwordProblem === undefined ? undefined : problemMessage(passwordProblem)}
        />
        <PasswordField
          id={CONFIRM_ID}
          label={text.newPassword.confirmPassword.label}
          placeholder={text.newPassword.confirmPassword.placeholder}
          autoComplete="new-password"
          value={confirm}
          onValueChange={(value) => {
            setConfirm(value);
            setMismatch(false);
          }}
          error={mismatch ? text.newPassword.confirmPassword.mismatch : undefined}
        />
        <FormError id="new-password-error" message={formError} />
        <SubmitButton text={text.newPassword.submit} loading={submitting} />
      </form>
    </>
  );
}
