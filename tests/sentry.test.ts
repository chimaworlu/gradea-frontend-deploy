import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureRequestError: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => sentry);
// next/font only works inside a Next.js build; the error screen only needs the class names.
vi.mock("../app/fonts", () => ({ lora: { variable: "lora" }, inter: { variable: "inter" } }));

const ROOT = join(__dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

beforeEach(() => {
  vi.resetModules();
  Object.values(sentry).forEach((fn) => fn.mockClear());
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function loadSentryLib() {
  return import("../lib/observability/sentry");
}

describe("Sentry is off without a DSN", () => {
  it("reads the DSN only from NEXT_PUBLIC_SENTRY_DSN", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const { sentryDsn } = await loadSentryLib();
    expect(sentryDsn()).toBeUndefined();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "  https://key@o0.ingest.example.test/1 ");
    expect(sentryDsn()).toBe("https://key@o0.ingest.example.test/1");
  });

  it("starts nothing in the browser or on the server when the DSN is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    await import("../instrumentation-client");
    const server = await import("../instrumentation");
    server.register();
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("starts in both places when the DSN is set, with replay off", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o0.ingest.example.test/1");
    await import("../instrumentation-client");
    (await import("../instrumentation")).register();
    expect(sentry.init).toHaveBeenCalledTimes(2);
    const [browser, server] = sentry.init.mock.calls.map(([options]) => options);
    expect(browser).toMatchObject({ replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0 });
    expect(browser.integrations).toBeUndefined();
    expect(server).toMatchObject({ includeLocalVariables: false });
    expect(read("instrumentation-client.ts")).not.toMatch(/replayIntegration/);
  });

  it("reports server render and route errors through Next.js", async () => {
    const server = await import("../instrumentation");
    expect(server.onRequestError).toBe(sentry.captureRequestError);
  });
});

describe("shared options", () => {
  it("keeps tracing at 0.1 and switches off every kind of personal or request data", async () => {
    const { sharedSentryOptions } = await loadSentryLib();
    const options = sharedSentryOptions("https://key@o0.ingest.example.test/1");
    expect(options.tracesSampleRate).toBe(0.1);
    expect(options.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
    });
    expect(options).not.toHaveProperty("sendDefaultPii");
  });
});

describe("scrubbing", () => {
  function fullEvent(): ErrorEvent {
    return {
      type: undefined,
      message: "typed: someone@example.test",
      transaction: "/reset-password?token=secret-token",
      server_name: "host-1",
      user: { id: "user_123", email: "someone@example.test", ip_address: "1.2.3.4" },
      request: {
        method: "POST",
        url: "https://usegradea.com/reset-password?token=secret-token",
        query_string: "token=secret-token",
        headers: { cookie: "session=abc", authorization: "Bearer x" },
        cookies: { session: "abc" },
        data: { password: "hunter22", email: "someone@example.test" },
      },
      extra: { cv: "My CV text" },
      exception: { values: [{ type: "TypeError", value: "Cannot read password hunter22" }] },
      breadcrumbs: [
        {
          type: "default",
          category: "ui.input",
          level: "info",
          timestamp: 1,
          message: "input[name=password]",
          data: { value: "hunter22" },
        },
      ],
      contexts: {
        trace: {
          trace_id: "t",
          span_id: "s",
          data: { "http.method": "GET", url: "https://x?token=secret-token" },
        },
        response: { status_code: 500, headers: { "set-cookie": "a=b" } },
      },
    };
  }

  it("removes everything that could identify the person or repeat what they typed", async () => {
    const { scrubEvent } = await loadSentryLib();
    const event = scrubEvent(fullEvent());
    expect(event.request).toEqual({ method: "POST" });
    expect(event.user).toEqual({ id: "user_123" });
    expect(event.message).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.server_name).toBeUndefined();
    expect(event.transaction).toBe("/reset-password");
    expect(event.exception?.values?.[0]).toEqual({ type: "TypeError", value: "[not sent]" });
    expect(event.breadcrumbs).toEqual([
      { type: "default", category: "ui.input", level: "info", timestamp: 1 },
    ]);
    expect(event.contexts?.trace?.data).toEqual({ "http.method": "GET" });
    expect(event.contexts?.response).toBeUndefined();
    const sent = JSON.stringify(event);
    for (const secret of [
      "someone@example.test",
      "hunter22",
      "secret-token",
      "My CV text",
      "1.2.3.4",
    ]) {
      expect(sent).not.toContain(secret);
    }
  });

  it("strips query strings from span descriptions", async () => {
    const { scrubEvent } = await loadSentryLib();
    const event = scrubEvent({
      type: "transaction",
      spans: [
        {
          span_id: "a",
          trace_id: "t",
          start_timestamp: 0,
          status: "ok",
          description: "GET /reset-password?token=secret-token",
          data: { "http.route": "/reset-password", "url.full": "https://x/?token=secret-token" },
        },
      ],
    });
    expect(event.spans?.[0]?.description).toBe("GET /reset-password");
    expect(event.spans?.[0]?.data).toEqual({ "http.route": "/reset-password" });
  });
});

describe("expected API errors", () => {
  it("drops any 4xx answer and keeps a 500", async () => {
    const { beforeSend } = await loadSentryLib();
    for (const status_code of [400, 401, 404, 409, 429]) {
      expect(beforeSend({ type: undefined, contexts: { response: { status_code } } })).toBeNull();
    }
    expect(
      beforeSend({ type: undefined, contexts: { response: { status_code: 500 } } }),
    ).not.toBeNull();
  });

  it("returns API error codes as values, so Sentry never sees them", async () => {
    const { apiRequest } = await import("../lib/api/client");
    const { AuthUserResponse } = await import("../lib/api/shared");
    const fetchFn = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ code: "invalid_credentials", message: "x" }), {
          status: 401,
        }),
    );
    const result = await apiRequest({
      method: "POST",
      path: "/api/auth/login",
      body: {},
      response: AuthUserResponse,
      fetchFn,
    });
    expect(result).toEqual({ kind: "error", code: "invalid_credentials" });
    expect(sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("global error screen", () => {
  it("shows the wording from the content file and never the error itself", async () => {
    const { default: GlobalError } = await import("../app/global-error");
    const { getContent } = await import("../lib/content");
    const errors = getContent("shared/errors");
    const error = Object.assign(new Error("password hunter22 failed"), {
      digest: "digest-not-shown-42",
    });
    const html = renderToStaticMarkup(createElement(GlobalError, { error }));
    expect(html).toContain(errors.screen.heading);
    expect(html).toContain(errors.byCode.internal_error);
    expect(html).toContain(errors.screen.retry);
    expect(html).not.toContain("hunter22");
    expect(html).not.toContain("digest-not-shown-42");
  });

  it("reports the error to Sentry", () => {
    expect(read("app/global-error.tsx")).toMatch(
      /useEffect\(\(\) => \{\s*Sentry\.captureException\(error\);/,
    );
  });
});

describe("build settings", () => {
  it("uploads no source maps, creates no release and sends no build telemetry", () => {
    const config = read("next.config.ts");
    expect(config).toContain("withSentryConfig(nextConfig, {");
    expect(config).toContain("telemetry: false");
    expect(config).toContain("sourcemaps: { disable: true }");
    expect(config).toContain("release: { create: false, finalize: false }");
    expect(config).not.toMatch(/authToken|tunnelRoute/);
  });

  it("lists NEXT_PUBLIC_SENTRY_DSN in .env.example with no value", () => {
    expect(read(".env.example")).toMatch(/^NEXT_PUBLIC_SENTRY_DSN=$/m);
  });
});
