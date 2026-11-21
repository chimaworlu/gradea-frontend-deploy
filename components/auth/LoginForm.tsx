"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  afterFailedLogin,
  checkLogin,
  googleStartUrl,
  hasProblems,
  logIn,
  loginBody,
  placeForCode,
  problemMessage,
  type FieldProblems,
  type LoginValues,
} from "../../lib/auth/forms";
import { getContent } from "../../lib/content";
import { pathAfterLogin } from "../../lib/scan/waiting-scan";
import {
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

const FIELD_IDS = { email: "login-email", password: "login-password" };

export type LoginFormProps = {
  /** The wording for a ?error= value the API sent after Google, shown at the top. */
  queryError?: string;
};

/** A4 Log in and Log in error. Values live in React state only (A4 dev notes). */
export function LoginForm({ queryError }: LoginFormProps) {
  const text = getContent("app/auth").logIn;
  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });
  const [problems, setProblems] = useState<FieldProblems>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  function update(place: keyof LoginValues, value: string) {
    setValues((current) => ({ ...current, [place]: value }));
    setProblems((current) => ({ ...current, [place]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setFormError(undefined);

    const found = checkLogin(values);
    setProblems(found);
    if (hasProblems(found)) {
      document.getElementById(found.email ? FIELD_IDS.email : FIELD_IDS.password)?.focus();
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    const result = await logIn(loginBody(values));
    inFlight.current = false;

    if (result.kind === "ok") {
      // Back to the upload page when a guest scan is waiting in this tab, so it is claimed;
      // otherwise home, as there is no Dashboard yet.
      window.location.assign(pathAfterLogin());
      return;
    }

    setSubmitting(false);
    // The email stays, the password is cleared (A4 dev notes, Log in error).
    setValues(afterFailedLogin(values));
    if (result.kind === "network") {
      setFormError(getContent("shared/errors").network);
    } else if (placeForCode(result.code) === "email") {
      setProblems({ email: result.code });
    } else {
      // invalid_credentials never says which one was wrong, so nobody can probe for accounts.
      setFormError(problemMessage(result.code));
    }
    document.getElementById(FIELD_IDS.password)?.focus();
  }

  const message = (place: keyof FieldProblems) => {
    const problem = problems[place];
    return problem === undefined ? undefined : problemMessage(problem);
  };

  return (
    <>
      <FormIntro heading={text.heading} subline={text.subline} />
      {/* A Google sign-in that failed or was cancelled comes back here with ?error= (SRS Section 5). */}
      {queryError ? (
        <p className={`${styles.formError} ${styles.intro}`} role="alert">
          {queryError}
        </p>
      ) : null}
      <GoogleButton href={googleStartUrl()} text={text.google} />
      <Divider text={text.divider} />
      <form
        className={styles.form}
        onSubmit={submit}
        noValidate
        aria-describedby="login-form-error"
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
          // The only autofocus in the app, by the founder's rule: nowhere else moves focus on load.
          autoFocus
          value={values.email}
          onValueChange={(value) => update("email", value)}
          error={message("email")}
        />
        <PasswordField
          id={FIELD_IDS.password}
          label={text.form.password.label}
          placeholder={text.form.password.placeholder}
          autoComplete="current-password"
          value={values.password}
          onValueChange={(value) => update("password", value)}
          error={message("password")}
        />
        <Link className={`${styles.strongLink} ${styles.alignEnd}`} href="/forgot-password">
          {text.form.forgotPassword}
        </Link>
        <FormError id="login-form-error" message={formError} />
        <SubmitButton text={text.form.submit} loading={submitting} />
      </form>
      <FooterPrompt prompt={text.footer.prompt} link={text.footer.link} href="/signup" />
    </>
  );
}
