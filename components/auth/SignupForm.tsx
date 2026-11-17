"use client";

import { useRef, useState, type FormEvent } from "react";
import type { ApiResult } from "../../lib/api/client";
import type { AuthUserResponse } from "../../lib/api/shared";
import {
  AFTER_AUTH_PATH,
  checkSignup,
  googleStartUrl,
  hasProblems,
  isCareerLevel,
  placeForCode,
  problemMessage,
  signUp,
  signupBody,
  type FieldProblems,
  type SignupValues,
} from "../../lib/auth/forms";
import { getContent } from "../../lib/content";
import { BotCheck } from "./BotCheck";
import { CareerLevelPicker } from "./CareerLevelPicker";
import {
  ConsentLine,
  Divider,
  FooterPrompt,
  FormError,
  FormIntro,
  GoogleButton,
  PasswordField,
  SubmitButton,
  TextField,
} from "./FormPieces";
import styles from "./form.module.css";

const FIELD_IDS = {
  email: "signup-email",
  password: "signup-password",
  careerLevel: "signup-career-level",
};

/** Puts focus on the first field with a problem, so keyboard and screen reader users land on it. */
function focusFirstProblem(problems: FieldProblems) {
  const first = (["email", "password", "careerLevel"] as const).find((place) => problems[place]);
  if (first !== undefined) document.getElementById(FIELD_IDS[first])?.focus();
}

/** A4 Sign up. Values live in React state only and are kept on every error (A4 dev notes). */
export function SignupForm() {
  const text = getContent("app/auth").signUp;
  const [values, setValues] = useState<SignupValues>({ email: "", password: "", careerLevel: "" });
  const [problems, setProblems] = useState<FieldProblems>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [botToken, setBotToken] = useState<string | undefined>(undefined);
  const [botResetKey, setBotResetKey] = useState(0);
  // A ref as well as state, so two fast clicks can never send two requests.
  const inFlight = useRef(false);

  function update(place: keyof SignupValues, value: string) {
    setValues((current) => ({ ...current, [place]: value }));
    setProblems((current) => ({ ...current, [place]: undefined }));
  }

  function showResult(result: ApiResult<AuthUserResponse>) {
    if (result.kind === "ok") {
      // No app yet: go to the home page with the new session cookie (Phase 1).
      window.location.assign(AFTER_AUTH_PATH);
      return;
    }
    // A bot token works once, so get a fresh one for the next try.
    setBotResetKey((key) => key + 1);
    if (result.kind === "network") {
      setFormError(getContent("shared/errors").network);
      return;
    }
    const place = placeForCode(result.code);
    if (place === "form") {
      setFormError(problemMessage(result.code));
    } else {
      const serverProblems = { [place]: result.code };
      setProblems(serverProblems);
      focusFirstProblem(serverProblems);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setFormError(undefined);

    const found = checkSignup(values);
    setProblems(found);
    if (hasProblems(found) || !isCareerLevel(values.careerLevel)) {
      focusFirstProblem(found);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    const result = await signUp(
      signupBody({ ...values, careerLevel: values.careerLevel }, botToken),
    );
    inFlight.current = false;
    // On success the page is leaving, so the button keeps its loading words.
    if (result.kind !== "ok") setSubmitting(false);
    showResult(result);
  }

  const message = (place: keyof FieldProblems) => {
    const problem = problems[place];
    return problem === undefined ? undefined : problemMessage(problem);
  };

  return (
    <>
      <FormIntro heading={text.heading} subline={text.subline} />
      <GoogleButton href={googleStartUrl()} text={text.google} />
      <Divider text={text.divider} />
      <form
        className={styles.form}
        onSubmit={submit}
        noValidate
        aria-describedby="signup-form-error"
      >
        <TextField
          id={FIELD_IDS.email}
          label={text.form.email.label}
          placeholder={text.form.email.placeholder}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={values.email}
          onValueChange={(value) => update("email", value)}
          error={message("email")}
        />
        <PasswordField
          id={FIELD_IDS.password}
          label={text.form.password.label}
          placeholder={text.form.password.placeholder}
          autoComplete="new-password"
          value={values.password}
          onValueChange={(value) => update("password", value)}
          error={message("password")}
        />
        <CareerLevelPicker
          id={FIELD_IDS.careerLevel}
          value={values.careerLevel}
          onValueChange={(value) => update("careerLevel", value)}
          error={message("careerLevel")}
        />
        <BotCheck onToken={setBotToken} resetKey={botResetKey} />
        <FormError id="signup-form-error" message={formError} />
        <SubmitButton text={text.form.submit} loading={submitting} />
      </form>
      <ConsentLine text={text.form.consent} />
      <FooterPrompt prompt={text.footer.prompt} link={text.footer.link} href="/login" />
    </>
  );
}
