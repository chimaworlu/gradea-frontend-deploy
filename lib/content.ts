import accountLink from "../content/app/account-link.json";
import auth from "../content/app/auth.json";
import forgotPassword from "../content/app/forgot-password.json";
import googleSignup from "../content/app/google-signup.json";
import processing from "../content/app/processing.json";
import signupWall from "../content/app/signup-wall.json";
import upload from "../content/app/upload.json";
import comingSoon from "../content/marketing/coming-soon.json";
import contact from "../content/shared/contact.json";
import errors from "../content/shared/errors.json";
import forms from "../content/shared/forms.json";
import type { CareerLevel, ErrorCode, GOOGLE_FRONTEND_PATHS, ScoreCategory } from "./api/shared";

/** Every content file starts with an id and a title that match the screen list. */
export type ContentFileHeader = { id: string; title: string };

// Every content file is registered here. Its type is inferred from the JSON itself, so a
// missing or misspelled key is a type error at build time (content-and-copy rule, Section 1).
const contentFiles = {
  "app/account-link": accountLink,
  "app/auth": auth,
  "app/forgot-password": forgotPassword,
  "app/google-signup": googleSignup,
  "app/processing": processing,
  "app/signup-wall": signupWall,
  "app/upload": upload,
  "marketing/coming-soon": comingSoon,
  "shared/contact": contact,
  "shared/errors": errors,
  "shared/forms": forms,
} satisfies Record<string, ContentFileHeader>;

/**
 * T itself when it has a string for every key in K and no other key, otherwise never, so
 * assigning a content section to it fails the type check on a missing or an extra key.
 */
export type ExactTextRecord<K extends string, T> =
  T extends Record<K, string> ? ([Exclude<keyof T, K>] extends [never] ? T : never) : never;

/** The error query values the API puts on /login after Google, for example google_failed. */
export type LoginQueryError =
  (typeof GOOGLE_FRONTEND_PATHS)[keyof typeof GOOGLE_FRONTEND_PATHS] extends infer Path
    ? Path extends `/login?error=${infer Code}`
      ? Code
      : never
    : never;

// SRS Section 12: the frontend shows its own wording for each API error code. The codes come
// from the shared API file, so a code added in gradea-backend fails here until it has wording.
const errorMessages: ExactTextRecord<ErrorCode, typeof errors.byCode> = errors.byCode;
const loginQueryErrors: ExactTextRecord<LoginQueryError, typeof auth.logIn.queryErrors> =
  auth.logIn.queryErrors;
const careerLevelOptions: ExactTextRecord<CareerLevel, typeof forms.careerLevel.options> =
  forms.careerLevel.options;
const scoreCategoryNames: ExactTextRecord<ScoreCategory, typeof signupWall.preview.categories> =
  signupWall.preview.categories;

/** The name of a General Analysis category, for example "Brevity & Style" (PRD Section 12.1). */
export function scoreCategoryLabel(category: ScoreCategory): string {
  return scoreCategoryNames[category];
}

/** The wording for an API error code. */
export function errorMessage(code: ErrorCode): string {
  return errorMessages[code];
}

/** The wording for an error query value on /login, for example google_cancelled. */
export function loginQueryErrorMessage(code: LoginQueryError): string {
  return loginQueryErrors[code];
}

/** True when a /login ?error= value is one the API sends, so its wording exists. */
export function isLoginQueryError(value: string): value is LoginQueryError {
  return Object.hasOwn(loginQueryErrors, value);
}

/** The label for a career level, for example "Entry-level" for entry. */
export function careerLevelLabel(level: CareerLevel): string {
  return careerLevelOptions[level];
}

export type ContentFileKey = keyof typeof contentFiles;
export type ContentFile<K extends ContentFileKey> = (typeof contentFiles)[K];

/** Returns the typed text for one screen, for example getContent("marketing/coming-soon"). */
export function getContent<K extends ContentFileKey>(key: K): ContentFile<K> {
  return contentFiles[key];
}

/** Every registered content file with its key, for checks and tests. */
export function listContentFiles(): Array<[ContentFileKey, ContentFileHeader]> {
  return Object.entries(contentFiles).map(([key, file]) => {
    if (!isContentFileKey(key)) {
      throw new Error(`Unknown content file key: ${key}`);
    }
    return [key, file];
  });
}

function isContentFileKey(key: string): key is ContentFileKey {
  return Object.hasOwn(contentFiles, key);
}

export type PlaceholderValues = Record<string, string | number>;

/**
 * Fills placeholders such as {price} or {date} in a content string.
 * Throws if the text names a placeholder with no value, so a half-filled sentence is never shown.
 */
export function fillPlaceholders(template: string, values: PlaceholderValues): string {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new Error(`Missing value for placeholder {${name}}.`);
    }
    return String(value);
  });
}

/**
 * Splits a content string at its placeholders and puts a value (text or an element, such as a
 * link) in each one, for example the consent line's {terms} and {privacy} links. Throws on a
 * placeholder with no value, like fillPlaceholders.
 */
export function placeholderParts<T>(
  template: string,
  values: Record<string, T>,
): Array<string | T> {
  const parts: Array<string | T> = [];
  for (const piece of template.split(/(\{[a-zA-Z][a-zA-Z0-9]*\})/)) {
    const match = /^\{([a-zA-Z][a-zA-Z0-9]*)\}$/.exec(piece);
    if (match === null) {
      if (piece !== "") parts.push(piece);
      continue;
    }
    const name = match[1] ?? "";
    const value = Object.hasOwn(values, name) ? values[name] : undefined;
    if (value === undefined) {
      throw new Error(`Missing value for placeholder {${name}}.`);
    }
    parts.push(value);
  }
  return parts;
}

/**
 * The support address, from content/shared/contact.json. The Contact, Privacy and Terms pages,
 * the billing-error link and any help text read it from here, never typed in a component.
 */
export function supportEmail(): string {
  return contact.supportEmail;
}

/** A mailto link to the support address, for example href={supportMailto()}. */
export function supportMailto(): string {
  return `mailto:${contact.supportEmail}`;
}
