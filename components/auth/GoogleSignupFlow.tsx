"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AFTER_SIGNUP_PATH,
  SIGNUP_PATH,
  isCareerLevel,
  problemMessage,
} from "../../lib/auth/forms";
import {
  cancelGoogle,
  completeBody,
  completeGoogleSignup,
  googleFinishStep,
  submitOutcome,
} from "../../lib/auth/google";
import { savedCareerLevel } from "../../lib/scan/waiting-scan";
import type { ErrorCode } from "../../lib/api/shared";
import { fillPlaceholders, getContent } from "../../lib/content";
import { CareerLevelPicker } from "./CareerLevelPicker";
import { ConsentLine, FormError, FormIntro, SubmitButton, TextField } from "./FormPieces";
import { PendingChecking, PendingExpired, PendingFailed, useGooglePending } from "./GooglePending";
import styles from "./form.module.css";

const LEVEL_ID = "google-career-level";

/**
 * Finish sign-up after Google (/signup/google): the Google email is shown, not editable, and
 * the person picks a career level (FR-23). The consent line counts as consent.
 */
export function GoogleSignupFlow() {
  const text = getContent("app/google-signup");
  const errors = getContent("shared/errors");
  const pending = useGooglePending("signup");
  const [careerLevel, setCareerLevel] = useState("");
  const [levelProblem, setLevelProblem] = useState<ErrorCode | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState<"creating" | "cancelling" | undefined>(undefined);
  const inFlight = useRef(false);
  // True while the account is being created with the career level saved on the A3 wall.
  const [auto, setAuto] = useState(false);
  const autoStarted = useRef(false);

  // From the A3 wall with a career level already chosen: create the account with it, once,
  // without showing the Finish page again (FR-23). /upload then claims the waiting scan and
  // goes on to processing. If it does not work, the Finish page shows with the level filled in.
  useEffect(() => {
    const step = googleFinishStep(pending, savedCareerLevel());
    if (step.kind !== "auto" || autoStarted.current) return;
    autoStarted.current = true;
    inFlight.current = true;
    setAuto(true);
    setCareerLevel(step.level);
    void completeGoogleSignup(step.body).then((result) => {
      const outcome = submitOutcome(result);
      if (outcome.kind === "done") {
        window.location.assign(AFTER_SIGNUP_PATH);
        return;
      }
      inFlight.current = false;
      setAuto(false);
      if (outcome.kind === "expired") setExpired(true);
      else if (outcome.kind === "network") setFormError(errors.network);
      else if (outcome.kind === "careerLevel") setLevelProblem(outcome.code);
      else setFormError(problemMessage(outcome.code));
    });
  }, [pending, errors.network]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setFormError(undefined);
    if (!isCareerLevel(careerLevel)) {
      setLevelProblem("career_level_required");
      document.getElementById(LEVEL_ID)?.focus();
      return;
    }

    inFlight.current = true;
    setBusy("creating");
    const outcome = submitOutcome(await completeGoogleSignup(completeBody(careerLevel)));
    if (outcome.kind === "done") {
      // A new account with no scan waiting lands on the upload page (Build Plan Phase 2).
      window.location.assign(AFTER_SIGNUP_PATH);
      return;
    }
    inFlight.current = false;
    setBusy(undefined);
    if (outcome.kind === "expired") setExpired(true);
    else if (outcome.kind === "network") setFormError(errors.network);
    else if (outcome.kind === "careerLevel") setLevelProblem(outcome.code);
    else setFormError(problemMessage(outcome.code));
  }

  async function cancel() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy("cancelling");
    const result = await cancelGoogle();
    if (result.kind === "ok") {
      window.location.assign(SIGNUP_PATH);
      return;
    }
    inFlight.current = false;
    setBusy(undefined);
    setFormError(result.kind === "network" ? errors.network : problemMessage(result.code));
  }

  if (pending.kind === "checking" || auto) return <PendingChecking text={text.checking.text} />;
  if (pending.kind === "expired" || expired) {
    return (
      <PendingExpired
        heading={text.expired.heading}
        body={text.expired.body}
        action={text.expired.signUp}
        href="/signup"
      />
    );
  }
  if (pending.kind !== "ready") {
    return <PendingFailed state={pending} action={text.expired.signUp} href="/signup" />;
  }

  return (
    <>
      <FormIntro
        heading={text.finishForm.heading}
        subline={fillPlaceholders(text.finishForm.body, { email: pending.email })}
      />
      <form
        className={styles.form}
        onSubmit={submit}
        noValidate
        aria-describedby="google-form-error"
      >
        <TextField
          id="google-email"
          label={text.finishForm.email.label}
          type="email"
          value={pending.email}
          onValueChange={() => undefined}
          readOnly
          inputClassName={styles.readOnly}
        />
        <CareerLevelPicker
          id={LEVEL_ID}
          value={careerLevel}
          onValueChange={(value) => {
            setCareerLevel(value);
            setLevelProblem(undefined);
          }}
          error={levelProblem === undefined ? undefined : problemMessage(levelProblem)}
          disabled={busy !== undefined}
        />
        <FormError id="google-form-error" message={formError} />
        <SubmitButton text={text.finishForm.submit} loading={busy === "creating"} />
      </form>
      <ConsentLine text={text.finishForm.consent} />
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.textAction}
          onClick={cancel}
          disabled={busy !== undefined}
          aria-busy={busy === "cancelling" ? true : undefined}
        >
          {busy === "cancelling" ? text.finishForm.cancel.loading : text.finishForm.cancel.default}
        </button>
      </div>
    </>
  );
}
