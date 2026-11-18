"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { AFTER_AUTH_PATH, LOGIN_PATH, problemMessage } from "../../lib/auth/forms";
import { cancelGoogle, linkBody, linkGoogle, submitOutcome } from "../../lib/auth/google";
import { fillPlaceholders, getContent } from "../../lib/content";
import { FormError, FormIntro, PasswordField, SubmitButton } from "./FormPieces";
import { PendingChecking, PendingExpired, PendingFailed, useGooglePending } from "./GooglePending";
import styles from "./form.module.css";

const PASSWORD_ID = "link-password";

/**
 * A6 Account link confirm. A Google sign-in matched an email that already has a password
 * account, so the person proves it is theirs with that password once. Never linked silently
 * (SRS Section 5, security.md section 1).
 */
export function LinkGoogleFlow() {
  const text = getContent("app/account-link");
  const errors = getContent("shared/errors");
  const pending = useGooglePending("link");
  const [password, setPassword] = useState("");
  const [passwordProblem, setPasswordProblem] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState<"linking" | "cancelling" | undefined>(undefined);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setFormError(undefined);
    if (password === "") {
      setPasswordProblem(problemMessage("password_required"));
      document.getElementById(PASSWORD_ID)?.focus();
      return;
    }

    inFlight.current = true;
    setBusy("linking");
    const outcome = submitOutcome(await linkGoogle(linkBody(password)));
    if (outcome.kind === "done") {
      // Linked and logged in: go where the person was headed. No app yet, so home (Phase 1).
      window.location.assign(AFTER_AUTH_PATH);
      return;
    }
    inFlight.current = false;
    setBusy(undefined);
    // A6 Wrong password: the field is cleared and focused, the red line sits above the button.
    setPassword("");
    if (outcome.kind === "expired") setExpired(true);
    else if (outcome.kind === "network") setFormError(errors.network);
    else setFormError(problemMessage(outcome.code));
    document.getElementById(PASSWORD_ID)?.focus();
  }

  async function cancel() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy("cancelling");
    const result = await cancelGoogle();
    if (result.kind === "ok") {
      // Nothing is linked or stored (A6 dev notes).
      window.location.assign(LOGIN_PATH);
      return;
    }
    inFlight.current = false;
    setBusy(undefined);
    setFormError(result.kind === "network" ? errors.network : problemMessage(result.code));
  }

  if (pending.kind === "checking") return <PendingChecking text={text.checking.text} />;
  if (pending.kind === "expired" || expired) {
    return (
      <PendingExpired
        heading={text.expired.heading}
        body={text.expired.body}
        action={text.expired.logIn}
        href="/login"
      />
    );
  }
  if (pending.kind !== "ready") {
    return <PendingFailed state={pending} action={text.expired.logIn} href="/login" />;
  }

  const linking = busy === "linking";
  return (
    <>
      <FormIntro
        heading={text.linkForm.heading}
        subline={fillPlaceholders(text.linkForm.body, { email: pending.email })}
      />
      <form className={styles.form} onSubmit={submit} noValidate aria-describedby="link-form-error">
        {/* While linking, the field and the Forgot password link drop to 40% (A6 Linking). */}
        <div className={linking ? styles.faded : undefined}>
          <PasswordField
            id={PASSWORD_ID}
            label={text.linkForm.password.label}
            placeholder={text.linkForm.password.placeholder}
            autoComplete="current-password"
            value={password}
            disabled={busy !== undefined}
            onValueChange={(value) => {
              setPassword(value);
              setPasswordProblem(undefined);
            }}
            error={passwordProblem}
          />
        </div>
        <Link
          className={`${styles.strongLink} ${styles.alignEnd} ${linking ? styles.faded : ""}`}
          href="/forgot-password"
          aria-disabled={linking ? true : undefined}
          tabIndex={linking ? -1 : undefined}
        >
          {text.linkForm.forgotPassword}
        </Link>
        <FormError id="link-form-error" message={formError} />
        <SubmitButton text={text.linkForm.submit} loading={linking} />
      </form>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.textAction}
          onClick={cancel}
          disabled={busy !== undefined}
          aria-busy={busy === "cancelling" ? true : undefined}
        >
          {busy === "cancelling" ? text.linkForm.cancel.loading : text.linkForm.cancel.default}
        </button>
      </div>
    </>
  );
}
