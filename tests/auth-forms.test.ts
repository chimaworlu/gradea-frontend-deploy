import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../components/auth/LoginForm";
import { SignupForm } from "../components/auth/SignupForm";
import { BotCheck } from "../components/auth/BotCheck";
import { apiRequest, apiUrl, DEFAULT_API_URL } from "../lib/api/client";
import { AuthUserResponse, ErrorCode } from "../lib/api/shared";
import {
  afterFailedLogin,
  checkLogin,
  checkSignup,
  cleanEmail,
  googleStartUrl,
  loginBody,
  placeForCode,
  problemMessage,
  queryErrorWording,
  signupBody,
} from "../lib/auth/forms";
import { getContent } from "../lib/content";

const ROOT = join(__dirname, "..");
const auth = getContent("app/auth");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Every .ts and .tsx file under the given folders, for source checks. */
function sourceFiles(...folders: string[]): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name)) files.push(path);
    }
  };
  folders.forEach((folder) => walk(join(ROOT, folder)));
  return files;
}

const validSignup = {
  email: "someone@example.test",
  password: "long enough 1",
  careerLevel: "mid",
};

describe("trimming", () => {
  it("trims the email", () => {
    expect(cleanEmail("  someone@example.test \n")).toBe("someone@example.test");
    expect(loginBody({ email: " someone@example.test ", password: "x" }).email).toBe(
      "someone@example.test",
    );
  });

  it("never trims or changes the password", () => {
    const password = "  spaces count  ";
    expect(loginBody({ email: "someone@example.test", password }).password).toBe(password);
    const body = signupBody({ ...validSignup, careerLevel: "mid", password }, undefined);
    expect(body.password).toBe(password);
    expect(checkSignup({ ...validSignup, password: " 1234567" }).password).toBeUndefined();
  });

  it("sends consent: true and the bot token only when there is one", () => {
    expect(signupBody({ ...validSignup, careerLevel: "mid" }, undefined)).toEqual({
      email: "someone@example.test",
      password: "long enough 1",
      career_level: "mid",
      consent: true,
    });
    expect(signupBody({ ...validSignup, careerLevel: "mid" }, "token").bot_token).toBe("token");
  });
});

describe("password length rules (shared counters)", () => {
  const passwordProblem = (password: string) => checkSignup({ ...validSignup, password }).password;

  it("needs at least 8 characters, counted as a person sees them", () => {
    expect(passwordProblem("1234567")).toBe("password_too_short");
    expect(passwordProblem("12345678")).toBeUndefined();
    // Seven accented letters are 14 bytes but still only 7 characters.
    expect(passwordProblem("ééééééé")).toBe("password_too_short");
  });

  it("allows at most 72 bytes", () => {
    expect(passwordProblem("a".repeat(72))).toBeUndefined();
    expect(passwordProblem("a".repeat(73))).toBe("password_too_long");
    // "é" is 2 bytes: 36 fit exactly, 37 are 74 bytes.
    expect(passwordProblem("é".repeat(36))).toBeUndefined();
    expect(passwordProblem("é".repeat(37))).toBe("password_too_long");
  });

  it("checks the email shape and the career level", () => {
    expect(checkSignup(validSignup)).toEqual({});
    expect(checkSignup({ ...validSignup, email: "not-an-email" }).email).toBe("email_invalid");
    expect(checkSignup({ ...validSignup, careerLevel: "" }).careerLevel).toBe(
      "career_level_required",
    );
    expect(checkLogin({ email: "someone@example.test", password: "" }).password).toBe(
      "password_required",
    );
  });
});

describe("error code to field", () => {
  it("puts email_* under the email, password_* under the password, career level under the picker", () => {
    for (const code of ErrorCode.options) {
      const expected = code.startsWith("email_")
        ? "email"
        : code.startsWith("password_")
          ? "password"
          : code === "career_level_required"
            ? "careerLevel"
            : "form";
      expect(placeForCode(code), code).toBe(expected);
    }
    expect(placeForCode("invalid_credentials")).toBe("form");
    expect(placeForCode("rate_limited")).toBe("form");
  });

  it("takes every message from the content files", () => {
    const errors = getContent("shared/errors").byCode;
    expect(problemMessage("email_taken")).toBe(errors.email_taken);
    expect(problemMessage("email_invalid")).toBe(getContent("shared/forms").email.invalid);
    expect(problemMessage("password_required")).toBe(getContent("shared/forms").password.required);
  });
});

describe("failed log in", () => {
  it("keeps the email and clears the password", () => {
    expect(afterFailedLogin({ email: "someone@example.test", password: "secret123" })).toEqual({
      email: "someone@example.test",
      password: "",
    });
  });

  it("uses that rule in the log in form", () => {
    const source = readFileSync(join(ROOT, "components/auth/LoginForm.tsx"), "utf8");
    expect(source).toContain("setValues(afterFailedLogin(values))");
  });
});

describe("autofocus", () => {
  it("is used only on the log in email field", () => {
    const uses = sourceFiles("app", "components").flatMap((file) =>
      (readFileSync(file, "utf8").match(/\bautoFocus\b/g) ?? []).map(() =>
        relative(ROOT, file).replaceAll("\\", "/"),
      ),
    );
    expect(uses).toEqual(["components/auth/LoginForm.tsx"]);
    const login = readFileSync(join(ROOT, "components/auth/LoginForm.tsx"), "utf8");
    expect(login).toMatch(/id=\{FIELD_IDS\.email\}[\s\S]*?autoFocus[\s\S]*?\/>/);
    expect(renderToStaticMarkup(createElement(SignupForm))).not.toMatch(/autofocus/i);
  });
});

describe("browser storage", () => {
  it("never stores anything, least of all a password, in browser storage or cookies", () => {
    for (const file of sourceFiles("app", "components", "lib")) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
    }
  });

  it("renders password fields empty and with the right autocomplete", () => {
    const signup = renderToStaticMarkup(createElement(SignupForm));
    const login = renderToStaticMarkup(createElement(LoginForm, {}));
    expect(signup).toMatch(
      /<input[^>]*type="password"[^>]*autoComplete="new-password"|<input[^>]*autoComplete="new-password"[^>]*type="password"/,
    );
    expect(login).toMatch(/autoComplete="current-password"/);
    expect(signup).toMatch(/autoComplete="email"/);
    expect(login).toMatch(/autoComplete="email"/);
    expect(signup).not.toMatch(/name="signup-password"[^>]*value="[^"]/);
  });
});

describe("Continue with Google", () => {
  it("is a full page link to the API start route, not a button that fetches", () => {
    expect(googleStartUrl()).toBe(`${DEFAULT_API_URL}/api/auth/google`);
    for (const html of [
      renderToStaticMarkup(createElement(SignupForm)),
      renderToStaticMarkup(createElement(LoginForm, {})),
    ]) {
      expect(html).toContain(`<a class=`);
      expect(html).toMatch(new RegExp(`<a [^>]*href="${DEFAULT_API_URL}/api/auth/google"`));
    }
  });

  it("uses NEXT_PUBLIC_API_URL when it is set", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/");
    expect(googleStartUrl()).toBe("https://api.example.test/api/auth/google");
  });
});

describe("A4 screens render from the content file", () => {
  it("renders Sign up", () => {
    const html = renderToStaticMarkup(createElement(SignupForm));
    expect(html).toContain(auth.signUp.heading);
    expect(html).toContain(auth.signUp.form.submit.default);
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/login"');
    expect(html).toContain(getContent("shared/forms").careerLevel.placeholder);
    expect(html).toContain('<label class="');
  });

  it("renders Log in, and the Google error from the query at the top", () => {
    const html = renderToStaticMarkup(createElement(LoginForm, {}));
    expect(html).toContain(auth.logIn.heading);
    expect(html).toContain('href="/forgot-password"');
    expect(html).toContain('href="/signup"');
    expect(html).not.toContain('role="alert"');

    const failed = queryErrorWording("google_failed");
    expect(failed).toBe(auth.logIn.queryErrors.google_failed);
    expect(queryErrorWording(["google_cancelled"])).toBe(auth.logIn.queryErrors.google_cancelled);
    expect(queryErrorWording("something_else")).toBeUndefined();
    expect(queryErrorWording(undefined)).toBeUndefined();
    const withError = renderToStaticMarkup(createElement(LoginForm, { queryError: failed }));
    expect(withError.indexOf('role="alert"')).toBeLessThan(withError.indexOf("<form"));
  });

  it("renders no bot check without a site key", () => {
    expect(
      renderToStaticMarkup(createElement(BotCheck, { onToken: () => undefined, resetKey: 0 })),
    ).toBe("");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");
    expect(
      renderToStaticMarkup(createElement(BotCheck, { onToken: () => undefined, resetKey: 0 })),
    ).toBe("<div></div>");
  });
});

describe("API client", () => {
  const user = {
    id: "u1",
    email: "someone@example.test",
    career_level: "mid",
    subscription_status: "free",
    subscription_plan: null,
    subscription_expires_at: null,
    grace_until: null,
    region: "nigeria",
    role: "user",
    created_at: "2026-11-17T10:00:00.000Z",
  };

  function fakeFetch(status: number, body: unknown) {
    return vi.fn<typeof fetch>(
      async () => new Response(body === undefined ? "" : JSON.stringify(body), { status }),
    );
  }

  it("sends JSON with the cookie and returns the checked answer", async () => {
    const fetchFn = fakeFetch(201, { user });
    const result = await apiRequest({
      method: "POST",
      path: "/api/auth/signup",
      body: { a: 1 },
      response: AuthUserResponse,
      fetchFn,
    });
    expect(result).toEqual({ kind: "ok", data: { user } });
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(apiUrl("/api/auth/signup"));
    expect(init?.credentials).toBe("include");
    expect(init?.body).toBe('{"a":1}');
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });

  it("returns the error code, or internal_error for an answer that breaks the contract", async () => {
    const request = {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      response: AuthUserResponse,
    };
    expect(
      await apiRequest({
        ...request,
        fetchFn: fakeFetch(401, { code: "invalid_credentials", message: "x" }),
      }),
    ).toEqual({ kind: "error", code: "invalid_credentials" });
    expect(await apiRequest({ ...request, fetchFn: fakeFetch(200, { user: { id: 1 } }) })).toEqual({
      kind: "error",
      code: "internal_error",
    });
    expect(await apiRequest({ ...request, fetchFn: fakeFetch(502, undefined) })).toEqual({
      kind: "error",
      code: "internal_error",
    });
  });

  it("returns a network result when no answer came back, and logs nothing", async () => {
    const logs = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(
      await apiRequest({
        method: "POST",
        path: "/api/auth/login",
        body: { email: "someone@example.test", password: "secret123" },
        response: AuthUserResponse,
        fetchFn,
      }),
    ).toEqual({ kind: "network" });
    logs.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
