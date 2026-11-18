"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { getContent, placeholderParts } from "../../lib/content";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./form.module.css";

// Shared pieces for the auth forms (A3, A4, A5, A6). Every word comes from the content files;
// callers pass the screen's text in, shared text is read here from content/shared.

/** Ids of the helper and error lines that describe a field, for aria-describedby. */
function describedBy(id: string, helper: string | undefined, error: string | undefined) {
  const ids = [helper ? `${id}-helper` : "", error ? `${id}-error` : ""].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

type FieldFrameProps = {
  id: string;
  label: string;
  error?: string;
  helper?: string;
  children: ReactNode;
};

/** Label above, the control, then helper and error lines below (design tokens, "inputs"). */
export function Field({ id, label, error, helper, children }: FieldFrameProps) {
  return (
    <div className={styles.field}>
      <label id={`${id}-label`} className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.control}>{children}</div>
      {helper ? (
        <p id={`${id}-helper`} className={styles.helper}>
          {helper}
        </p>
      ) : null}
      {/* Always present, so a screen reader announces a message when it appears. */}
      <p id={`${id}-error`} className={styles.error} aria-live="polite">
        {error ?? ""}
      </p>
    </div>
  );
}

type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "className" | "value" | "onChange" | "children"
>;

export type TextFieldProps = InputProps & {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  helper?: string;
  /** An extra class for the input, for example the read-only look. */
  inputClassName?: string;
};

export function TextField({
  id,
  label,
  value,
  onValueChange,
  error,
  helper,
  inputClassName,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field id={id} label={label} error={error} helper={helper}>
      <input
        {...inputProps}
        id={id}
        name={id}
        className={`${styles.input} ${inputClassName ?? ""} ${error ? styles.invalid : ""}`}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, helper, error)}
      />
    </Field>
  );
}

export type PasswordFieldProps = Omit<
  TextFieldProps,
  "type" | "autoComplete" | "inputClassName"
> & {
  autoComplete: "new-password" | "current-password";
};

/**
 * A password input with the eye toggle. The value lives only in the form's React state: it is
 * never written to storage, a cookie or the address bar (security.md section 1).
 */
export function PasswordField({
  id,
  label,
  value,
  onValueChange,
  error,
  helper,
  disabled,
  ...inputProps
}: PasswordFieldProps) {
  const [shown, setShown] = useState(false);
  const toggle = getContent("shared/forms").passwordToggle;
  return (
    <Field id={id} label={label} error={error} helper={helper}>
      <input
        {...inputProps}
        id={id}
        name={id}
        type={shown ? "text" : "password"}
        className={`${styles.input} ${styles.withIcon} ${error ? styles.invalid : ""}`}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, helper, error)}
      />
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => setShown((current) => !current)}
        aria-label={shown ? toggle.hide : toggle.show}
        aria-controls={id}
        disabled={disabled}
      >
        {/* The icon shows the current state, by the founder's decision (the Figma frames will be
            updated): crossed-out eye while hidden (the default), open eye while shown. The label
            says what a press will do. */}
        <FieldIcon name={shown ? "eye" : "eyeOff"} />
      </button>
    </Field>
  );
}

export type ButtonText = { default: string; loading: string };

/** The primary button. While loading it shows its loading words and cannot be pressed again. */
export function SubmitButton({ text, loading }: { text: ButtonText; loading: boolean }) {
  return (
    <button
      type="submit"
      className={styles.primary}
      disabled={loading}
      aria-busy={loading ? true : undefined}
    >
      {loading ? text.loading : text.default}
    </button>
  );
}

/** The one red line above the button for errors that belong to no single field. */
export function FormError({ id, message }: { id: string; message: string | undefined }) {
  return (
    <p id={id} className={styles.formError} aria-live="assertive">
      {message ?? ""}
    </p>
  );
}

export type ConsentText = { text: string; terms: string; privacy: string };

/** "By creating an account you agree to our Terms and Privacy policy." Counts as consent. */
export function ConsentLine({ text }: { text: ConsentText }) {
  const parts = placeholderParts<ReactNode>(text.text, {
    terms: (
      <Link className={styles.inlineLink} href="/terms">
        {text.terms}
      </Link>
    ),
    privacy: (
      <Link className={styles.inlineLink} href="/privacy">
        {text.privacy}
      </Link>
    ),
  });
  return (
    <p className={styles.note}>
      {parts.map((part, index) => (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </p>
  );
}

/**
 * "Continue with Google": a full page visit to the API's Google start route, never a fetch,
 * because the API sends the browser on to Google and back (SRS Section 5).
 */
export function GoogleButton({ href, text }: { href: string; text: ButtonText }) {
  const [leaving, setLeaving] = useState(false);

  // Coming back with the browser's Back button restores the page from memory; show it ready again.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setLeaving(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <a
      className={styles.secondary}
      href={href}
      onClick={() => setLeaving(true)}
      aria-busy={leaving ? true : undefined}
    >
      <Image
        className={styles.googleIcon}
        src="/brand/google-logo.svg"
        alt=""
        width={20}
        height={20}
      />
      {leaving ? text.loading : text.default}
    </a>
  );
}

/** The thin lines with "or" between the Google button and the email form. */
export function Divider({ text }: { text: string }) {
  return (
    <p className={styles.divider} role="separator">
      {text}
    </p>
  );
}

/** "Already have an account? Log in" and similar lines under the form. */
export function FooterPrompt({
  prompt,
  link,
  href,
}: {
  prompt: string;
  link: string;
  href: string;
}) {
  return (
    <p className={styles.footer}>
      {prompt}{" "}
      <Link className={styles.strongLink} href={href}>
        {link}
      </Link>
    </p>
  );
}

/** Heading and subline at the top of an auth form. */
export function FormIntro({ heading, subline }: { heading: string; subline: string }) {
  return (
    <div className={styles.intro}>
      <h1 className={styles.heading}>{heading}</h1>
      <p className={styles.subline}>{subline}</p>
    </div>
  );
}
