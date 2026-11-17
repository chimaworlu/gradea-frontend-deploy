import { describe, expect, it } from "vitest";
import { CareerLevel, ErrorCode, GOOGLE_FRONTEND_PATHS } from "../lib/api/shared";
import {
  careerLevelLabel,
  errorMessage,
  fillPlaceholders,
  getContent,
  loginQueryErrorMessage,
  type ExactTextRecord,
} from "../lib/content";

const errors = getContent("shared/errors");

describe("error wording by API error code", () => {
  it("has wording for every code in the shared API file, and no other code", () => {
    expect(Object.keys(errors.byCode).sort()).toEqual([...ErrorCode.options].sort());
    for (const code of ErrorCode.options) {
      expect(errorMessage(code).trim(), code).not.toBe("");
    }
  });

  it("uses the locked wording", () => {
    const locked: Partial<Record<ErrorCode, string>> = {
      email_disposable: "Please use a real email address.",
      email_domain_not_found: "We can't find that email domain. Check for typos.",
      email_taken: "That email already has an account.",
      password_too_short: "Use at least 8 characters.",
      password_too_long: "Use at most 72 characters.",
      password_too_common: "That password is too common.",
      career_level_required: "Choose your career level.",
      invalid_credentials: "Email or password is wrong.",
      wrong_password: "That password is wrong.",
      guest_session_invalid:
        "This scan has expired or can't be found. Please upload your CV again.",
    };
    for (const [code, text] of Object.entries(locked)) {
      expect(errors.byCode, code).toHaveProperty(code, text);
    }
  });

  it("fails the type check on a missing or an extra code", () => {
    // @ts-expect-error: proves a missing code fails npm run typecheck.
    const missing: ExactTextRecord<"a" | "b", { a: string }> = { a: "A" };
    // @ts-expect-error: proves an extra code fails npm run typecheck.
    const extra: ExactTextRecord<"a", { a: string; b: string }> = { a: "A", b: "B" };
    expect([missing, extra]).toHaveLength(2);
  });
});

describe("login error query values after Google", () => {
  it("has wording for every error the API puts on /login", () => {
    const codes = [GOOGLE_FRONTEND_PATHS.failed, GOOGLE_FRONTEND_PATHS.cancelled].map((path) =>
      new URL(path, "https://example.test").searchParams.get("error"),
    );
    expect(codes).toEqual(["google_failed", "google_cancelled"]);
    expect(Object.keys(getContent("app/auth").logIn.queryErrors).sort()).toEqual([
      "google_cancelled",
      "google_failed",
    ]);
    expect(loginQueryErrorMessage("google_failed").trim()).not.toBe("");
    expect(loginQueryErrorMessage("google_cancelled").trim()).not.toBe("");
  });
});

describe("career level labels", () => {
  it("has a label for every career level", () => {
    expect(CareerLevel.options.map((level) => careerLevelLabel(level))).toEqual([
      "Entry-level",
      "Mid-level",
      "Senior",
      "Executive",
    ]);
  });
});

describe("A4, A5 and A6 wording", () => {
  it("matches the designs", () => {
    const auth = getContent("app/auth");
    expect(auth.id).toBe("A4");
    expect(auth.signUp.heading).toBe("Create your account");
    expect(auth.signUp.form.submit.default).toBe("Create account");
    expect(auth.logIn.heading).toBe("Log in");
    expect(auth.logIn.form.forgotPassword).toBe("Forgot password?");

    const reset = getContent("app/forgot-password");
    expect(reset.id).toBe("A5");
    expect(reset.request.submit.default).toBe("Send reset link");
    expect(reset.linkExpired.heading).toBe("This link has expired");
    expect(reset.success.heading).toBe("Password updated");

    const link = getContent("app/account-link");
    expect(link.id).toBe("A6");
    expect(link.linkForm.submit.default).toBe("Link accounts");
    expect(link.linkForm.submit.loading).toBe("Linking...");
  });

  it("fills the email placeholders without joining strings", () => {
    const email = "someone@example.test";
    expect(fillPlaceholders(getContent("app/account-link").linkForm.body, { email })).toBe(
      `${email} already has a Gradea account. Enter your password once to link it with Google.`,
    );
    expect(fillPlaceholders(getContent("app/forgot-password").emailSent.body, { email })).toContain(
      `If there is an account for ${email},`,
    );
    expect(fillPlaceholders(getContent("app/google-signup").finishForm.body, { email })).toContain(
      email,
    );
  });

  it("keeps the consent line the same on both sign-up paths", () => {
    expect(getContent("app/google-signup").finishForm.consent).toEqual(
      getContent("app/auth").signUp.form.consent,
    );
  });
});
