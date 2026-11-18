import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ForgotPasswordFlow } from "../components/auth/ForgotPasswordFlow";
import { GoogleSignupFlow } from "../components/auth/GoogleSignupFlow";
import { LinkGoogleFlow } from "../components/auth/LinkGoogleFlow";
import { ResetPasswordFlow } from "../components/auth/ResetPasswordFlow";
import { metadata as forgotMeta } from "../app/forgot-password/page";
import { metadata as linkMeta } from "../app/link-google/page";
import { metadata as resetMeta } from "../app/reset-password/page";
import { metadata as googleSignupMeta } from "../app/signup/google/page";
import nextConfig from "../next.config";
import { problemMessage } from "../lib/auth/forms";
import {
  completeBody,
  completeGoogleSignup,
  linkBody,
  pendingView,
  submitOutcome,
} from "../lib/auth/google";
import {
  addressWithoutToken,
  checkNewPassword,
  completeOutcome,
  completeResetBody,
  readResetToken,
  requestOutcome,
  requestReset,
  requestResetBody,
  secondsLeft,
} from "../lib/auth/reset";
import { getContent } from "../lib/content";

const ROOT = join(__dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const A5_A6_FILES = [
  "components/auth/ForgotPasswordFlow.tsx",
  "components/auth/ResetPasswordFlow.tsx",
  "components/auth/LinkGoogleFlow.tsx",
  "components/auth/GoogleSignupFlow.tsx",
  "components/auth/GooglePending.tsx",
  "lib/auth/reset.ts",
  "lib/auth/google.ts",
];
const reset = getContent("app/forgot-password");
const link = getContent("app/account-link");
const googleSignup = getContent("app/google-signup");

function okFetch(body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status: 200 }));
}

describe("reset token in the address", () => {
  it("reads the token exactly as it came, and nothing when it is missing", () => {
    expect(readResetToken("?token=abc_DEF-123")).toBe("abc_DEF-123");
    expect(readResetToken("?token=%20abc%20")).toBe(" abc ");
    expect(readResetToken("?token=")).toBeUndefined();
    expect(readResetToken("")).toBeUndefined();
  });

  it("removes the token from the address and keeps everything else", () => {
    expect(addressWithoutToken("/reset-password", "?token=abc", "")).toBe("/reset-password");
    expect(addressWithoutToken("/reset-password", "?token=abc&x=1", "#top")).toBe(
      "/reset-password?x=1#top",
    );
  });

  it("replaces the address as soon as the token is read", () => {
    const source = read("components/auth/ResetPasswordFlow.tsx");
    expect(source).toMatch(
      /readResetToken\(search\)[\s\S]*?window\.history\.replaceState\([\s\S]*?addressWithoutToken\(pathname, search, hash\)/,
    );
  });

  it("sends no referrer and is never indexed", () => {
    expect(resetMeta.referrer).toBe("no-referrer");
    for (const meta of [forgotMeta, resetMeta, linkMeta, googleSignupMeta]) {
      expect(meta.robots).toEqual({ index: false, follow: false });
    }
  });

  it("also sends the Referrer-Policy header on /reset-password", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    expect(rules).toContainEqual({
      source: "/reset-password",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    });
  });
});

describe("forgot password", () => {
  it("always shows the email sent state when the API accepts the request", async () => {
    // The API answers 200 { ok: true } whether or not the account exists.
    for (const email of ["has-account@example.test", "no-account@example.test"]) {
      const result = await requestReset(requestResetBody(email, undefined), okFetch({ ok: true }));
      expect(requestOutcome(result)).toEqual({ kind: "sent" });
    }
  });

  it("trims the email and adds the bot token only when there is one", () => {
    expect(requestResetBody("  someone@example.test ", undefined)).toEqual({
      email: "someone@example.test",
    });
    expect(requestResetBody("someone@example.test", "t").bot_token).toBe("t");
  });

  it("shows rate_limited by its wording", () => {
    const outcome = requestOutcome({ kind: "error", code: "rate_limited" });
    expect(outcome).toEqual({ kind: "error", code: "rate_limited" });
    expect(problemMessage("rate_limited")).toBe(getContent("shared/errors").byCode.rate_limited);
  });

  it("counts the Send again cooldown down in whole seconds", () => {
    expect(secondsLeft(30_000, 0)).toBe(30);
    expect(secondsLeft(30_000, 6_100)).toBe(24);
    expect(secondsLeft(30_000, 31_000)).toBe(0);
  });

  it("starts on the request form", () => {
    const html = renderToStaticMarkup(createElement(ForgotPasswordFlow));
    expect(html).toContain(reset.request.heading);
    expect(html).toContain(reset.request.submit.default);
    expect(html).toContain('href="/login"');
    expect(html).toContain('autoComplete="email"');
  });
});

describe("new password", () => {
  it("never trims the new password", () => {
    expect(completeResetBody("tok", "  spaced out  ")).toEqual({
      token: "tok",
      password: "  spaced out  ",
    });
  });

  it("checks the sign-up rules first, then that both boxes match", () => {
    expect(checkNewPassword("short", "short")).toEqual({ password: "password_too_short" });
    expect(checkNewPassword("long enough", "long enougH")).toEqual({
      confirm: "password_mismatch",
    });
    expect(checkNewPassword("long enough", "long enough")).toEqual({});
    expect(reset.newPassword.confirmPassword.mismatch.length).toBeGreaterThan(0);
  });

  it("maps each answer to the right state", () => {
    expect(completeOutcome({ kind: "ok", data: { ok: true } })).toEqual({ kind: "success" });
    expect(completeOutcome({ kind: "error", code: "reset_token_invalid" })).toEqual({
      kind: "expired",
    });
    for (const code of [
      "password_too_short",
      "password_too_long",
      "password_too_common",
    ] as const) {
      expect(completeOutcome({ kind: "error", code })).toEqual({ kind: "password", code });
    }
    expect(completeOutcome({ kind: "error", code: "rate_limited" })).toEqual({
      kind: "form",
      code: "rate_limited",
    });
    expect(completeOutcome({ kind: "network" })).toEqual({ kind: "network" });
  });

  it("shows link expired when the token is missing, and does not render before reading it", () => {
    expect(renderToStaticMarkup(createElement(ResetPasswordFlow))).toBe("");
    const source = read("components/auth/ResetPasswordFlow.tsx");
    expect(source).toContain('token === undefined ? "expired" : "form"');
  });
});

describe("Google pending sign-in", () => {
  it("shows the expired state for a missing or old pending cookie", () => {
    expect(pendingView({ kind: "error", code: "google_pending_invalid" }, "link")).toEqual({
      kind: "expired",
    });
    expect(pendingView({ kind: "error", code: "google_pending_invalid" }, "signup")).toEqual({
      kind: "expired",
    });
  });

  it("shows the expired state when the flow belongs to the other page", () => {
    const signupFlow = {
      kind: "ok" as const,
      data: { flow: "signup" as const, email: "a@example.test" },
    };
    expect(pendingView(signupFlow, "link")).toEqual({ kind: "expired" });
    expect(pendingView(signupFlow, "signup")).toEqual({ kind: "ready", email: "a@example.test" });
  });

  it("keeps other errors as errors with their wording", () => {
    expect(pendingView({ kind: "error", code: "google_not_configured" }, "link")).toEqual({
      kind: "error",
      code: "google_not_configured",
    });
    expect(pendingView({ kind: "network" }, "link")).toEqual({ kind: "network" });
  });

  it("shows the checking wording while the API answers", () => {
    expect(renderToStaticMarkup(createElement(LinkGoogleFlow))).toContain(link.checking.text);
    expect(renderToStaticMarkup(createElement(GoogleSignupFlow))).toContain(
      googleSignup.checking.text,
    );
  });
});

describe("A6 link", () => {
  it("shows wrong_password as the A6 wrong password line above the button", () => {
    expect(submitOutcome({ kind: "error", code: "wrong_password" })).toEqual({
      kind: "form",
      code: "wrong_password",
    });
    expect(problemMessage("wrong_password")).toBe("That password is wrong.");
  });

  it("clears the password after a failed link and sends it untrimmed", () => {
    expect(linkBody("  pass word ")).toEqual({ password: "  pass word " });
    expect(read("components/auth/LinkGoogleFlow.tsx")).toContain('setPassword("");');
  });

  it("goes to the expired state when the pending sign-in ran out meanwhile", () => {
    expect(submitOutcome({ kind: "error", code: "google_pending_invalid" })).toEqual({
      kind: "expired",
    });
  });
});

describe("finish sign-up with Google", () => {
  it("sends consent: true with the career level", async () => {
    expect(completeBody("senior")).toEqual({ career_level: "senior", consent: true });
    const user = {
      id: "u1",
      email: "a@example.test",
      career_level: "senior",
      subscription_status: "free",
      subscription_plan: null,
      subscription_expires_at: null,
      grace_until: null,
      region: "nigeria",
      role: "user",
      created_at: "2026-11-18T10:00:00.000Z",
    };
    const fetchFn = okFetch({ user });
    await completeGoogleSignup(completeBody("entry"), fetchFn);
    const init = fetchFn.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toEqual({ career_level: "entry", consent: true });
    expect(init?.credentials).toBe("include");
  });

  it("puts career_level_required under the picker and email_taken in the form line", () => {
    expect(submitOutcome({ kind: "error", code: "career_level_required" })).toEqual({
      kind: "careerLevel",
      code: "career_level_required",
    });
    expect(submitOutcome({ kind: "error", code: "email_taken" })).toEqual({
      kind: "form",
      code: "email_taken",
    });
  });
});

describe("browser rules on these pages", () => {
  it("stores nothing in browser storage and uses no autofocus", () => {
    for (const file of A5_A6_FILES) {
      const source = read(file);
      expect(source, file).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
      expect(source, file).not.toMatch(/\bautoFocus\b/);
    }
  });
});
