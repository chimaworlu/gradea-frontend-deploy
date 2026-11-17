import { apiRequest, apiUrl, type ApiResult } from "../api/client";
import { errorMessage, getContent, isLoginQueryError, loginQueryErrorMessage } from "../content";
import {
  CareerLevel,
  Email,
  LoginResponse,
  newPasswordProblem,
  AuthUserResponse,
  type ErrorCode,
  type LoginRequest,
  type SignupRequest,
} from "../api/shared";

// Rules for the A4 sign up and log in forms. Client checks are for speed only; the server
// stays the judge and its error code always wins (SRS Section 4 and 5).

/** Where "Continue with Google" goes: a full page visit to the API, never a fetch. */
export function googleStartUrl(): string {
  return apiUrl("/api/auth/google");
}

/** The email is trimmed before it is checked or sent. The server also lowercases it. */
export function cleanEmail(email: string): string {
  return email.trim();
}

/** True when the email has a plausible shape, using the shared contract's email rule. */
export function emailLooksValid(email: string): boolean {
  return Email.safeParse(cleanEmail(email)).success;
}

/** The career levels in the contract's order, for the picker. */
export const CAREER_LEVELS = CareerLevel.options;

export function isCareerLevel(value: string): value is CareerLevel {
  return CAREER_LEVELS.some((level) => level === value);
}

/** Which part of the form shows an error. */
export type ErrorPlace = "email" | "password" | "careerLevel" | "form";

/** email_* codes go under the email, password_* under the password, career level under the picker. */
export function placeForCode(code: ErrorCode): ErrorPlace {
  if (code.startsWith("email_")) return "email";
  if (code.startsWith("password_")) return "password";
  if (code === "career_level_required") return "careerLevel";
  return "form";
}

/** A problem the browser found before sending: an API error code, or one of its own. */
export type ClientProblem = ErrorCode | "email_invalid" | "password_required";

export type FieldProblems = Partial<Record<ErrorPlace, ClientProblem>>;

export type SignupValues = { email: string; password: string; careerLevel: string };
export type LoginValues = { email: string; password: string };

/** Sign-up checks in screen order. Never trims the password. */
export function checkSignup(values: SignupValues): FieldProblems {
  const problems: FieldProblems = {};
  if (!emailLooksValid(values.email)) problems.email = "email_invalid";
  // Same counters as the server: 8 characters at least, 72 bytes at most (SRS Section 5).
  const passwordProblem = newPasswordProblem(values.password);
  if (passwordProblem !== undefined) problems[placeForCode(passwordProblem)] = passwordProblem;
  if (!isCareerLevel(values.careerLevel)) problems.careerLevel = "career_level_required";
  return problems;
}

/** Log-in checks: an email shape and a password that is not empty. */
export function checkLogin(values: LoginValues): FieldProblems {
  const problems: FieldProblems = {};
  if (!emailLooksValid(values.email)) problems.email = "email_invalid";
  if (values.password === "") problems.password = "password_required";
  return problems;
}

/** The wording for a problem, from the content files. */
export function problemMessage(problem: ClientProblem): string {
  const forms = getContent("shared/forms");
  if (problem === "email_invalid") return forms.email.invalid;
  if (problem === "password_required") return forms.password.required;
  return errorMessage(problem);
}

export function hasProblems(problems: FieldProblems): boolean {
  return Object.keys(problems).length > 0;
}

/** The body for POST /api/auth/signup. The consent line counts as consent (A4 dev notes). */
export function signupBody(
  values: SignupValues & { careerLevel: CareerLevel },
  botToken: string | undefined,
): SignupRequest {
  return {
    email: cleanEmail(values.email),
    password: values.password,
    career_level: values.careerLevel,
    consent: true,
    ...(botToken === undefined ? {} : { bot_token: botToken }),
  };
}

export function loginBody(values: LoginValues): LoginRequest {
  return { email: cleanEmail(values.email), password: values.password };
}

/** After a failed log in the email stays and the password is cleared (A4 dev notes). */
export function afterFailedLogin(values: LoginValues): LoginValues {
  return { email: values.email, password: "" };
}

export function signUp(
  body: SignupRequest,
  fetchFn?: typeof fetch,
): Promise<ApiResult<AuthUserResponse>> {
  return apiRequest({
    method: "POST",
    path: "/api/auth/signup",
    body,
    response: AuthUserResponse,
    fetchFn,
  });
}

export function logIn(
  body: LoginRequest,
  fetchFn?: typeof fetch,
): Promise<ApiResult<LoginResponse>> {
  return apiRequest({
    method: "POST",
    path: "/api/auth/login",
    body,
    response: LoginResponse,
    fetchFn,
  });
}

/** The wording for a known /login ?error= value. Any other value shows nothing. */
export function queryErrorWording(error: string | string[] | undefined): string | undefined {
  const value = Array.isArray(error) ? error[0] : error;
  return value !== undefined && isLoginQueryError(value)
    ? loginQueryErrorMessage(value)
    : undefined;
}

/** Where a signed-in user goes for now. The Dashboard does not exist yet. */
export const AFTER_AUTH_PATH = "/";
