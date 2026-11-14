import { describe, expect, it, vi } from "vitest";
import {
  WAITLIST_PATH,
  buildWaitlistBody,
  createSingleFlight,
  isValidEmail,
  normaliseEmail,
  postWaitlist,
  submitWaitlist,
  toWaitlistOutcome,
  type FetchFn,
} from "../lib/waitlist";

const API = "https://api.example.test";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A fake fetch that records each call and answers with the given response. */
function fakeFetch(respond: () => Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchFn: FetchFn = (url, init) => {
    calls.push({ url, init });
    return respond();
  };
  return { fetchFn, calls };
}

function sentBody(init: RequestInit | undefined): unknown {
  if (typeof init?.body !== "string") {
    throw new Error("Expected a JSON string body.");
  }
  return JSON.parse(init.body);
}

describe("email check on the page", () => {
  it.each(["name@example.com", "ada.obi@gmail.com", "a+tag@mail.example.co.uk"])(
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each([
    "",
    "ada.obi@gmail",
    "ada.obi",
    "@example.com",
    "name@",
    "name@@example.com",
    "name @example.com",
    "name@example..com",
    `${"a".repeat(250)}@x.co`,
  ])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("trims spaces before checking and sending", () => {
    expect(normaliseEmail("  name@example.com \n")).toBe("name@example.com");
  });
});

describe("response to page state", () => {
  it("200 with ok true is joined (new and repeat emails answer the same)", () => {
    expect(toWaitlistOutcome(200, { ok: true })).toBe("joined");
  });

  it("200 with an unexpected body is the general error", () => {
    expect(toWaitlistOutcome(200, { ok: false })).toBe("error");
    expect(toWaitlistOutcome(200, null)).toBe("error");
  });

  it("400 validation_failed is the bad-email message", () => {
    expect(toWaitlistOutcome(400, { code: "validation_failed", message: "Check the email." })).toBe(
      "invalid_email",
    );
  });

  it("400 bot_check_failed is the general error", () => {
    expect(toWaitlistOutcome(400, { code: "bot_check_failed", message: "No." })).toBe("error");
  });

  it("429 rate_limited is the too-many-tries message", () => {
    expect(toWaitlistOutcome(429, { code: "rate_limited", message: "Slow down." })).toBe(
      "rate_limited",
    );
  });

  it("500 internal_error is the general error", () => {
    expect(toWaitlistOutcome(500, { code: "internal_error", message: "Oops." })).toBe("error");
  });

  it("an error body that is not the agreed shape is the general error", () => {
    expect(toWaitlistOutcome(400, { error: "bad" })).toBe("error");
    expect(toWaitlistOutcome(429, "Too many requests")).toBe("error");
  });
});

describe("postWaitlist", () => {
  it("POSTs JSON to the API address plus /api/waitlist, with no email in the URL", async () => {
    const { fetchFn, calls } = fakeFetch(async () => jsonResponse(200, { ok: true }));
    const outcome = await postWaitlist(
      API,
      buildWaitlistBody("name@example.com", undefined),
      fetchFn,
    );

    expect(outcome).toBe("joined");
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.url).toBe(`${API}${WAITLIST_PATH}`);
    expect(call?.url).not.toContain("name@example.com");
    expect(call?.init.method).toBe("POST");
    expect(call?.init.credentials).toBe("omit");
    expect(sentBody(call?.init)).toEqual({ email: "name@example.com", source: "launch" });
  });

  it.each([
    [200, { ok: true }, "joined"],
    [400, { code: "validation_failed", message: "x" }, "invalid_email"],
    [429, { code: "rate_limited", message: "x" }, "rate_limited"],
    [500, { code: "internal_error", message: "x" }, "error"],
  ] as const)("maps HTTP %i to %j", async (status, body, expected) => {
    const { fetchFn } = fakeFetch(async () => jsonResponse(status, body));
    expect(await postWaitlist(API, buildWaitlistBody("a@b.co", undefined), fetchFn)).toBe(expected);
  });

  it("maps a network failure to the general error", async () => {
    const { fetchFn } = fakeFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await postWaitlist(API, buildWaitlistBody("a@b.co", undefined), fetchFn)).toBe("error");
  });

  it("maps a body that is not JSON to the general error", async () => {
    const { fetchFn } = fakeFetch(
      async () => new Response("<html>Bad gateway</html>", { status: 502 }),
    );
    expect(await postWaitlist(API, buildWaitlistBody("a@b.co", undefined), fetchFn)).toBe("error");
  });
});

describe("submitWaitlist", () => {
  it("sends nothing for a bad email and shows the bad-email message", async () => {
    const { fetchFn, calls } = fakeFetch(async () => jsonResponse(200, { ok: true }));
    const getBotToken = vi.fn(async () => "token");
    const outcome = await submitWaitlist({
      rawEmail: "ada.obi@gmail",
      getApiUrl: () => API,
      turnstileSiteKey: "site-key",
      getBotToken,
      fetchFn,
    });
    expect(outcome).toBe("invalid_email");
    expect(calls).toHaveLength(0);
    expect(getBotToken).not.toHaveBeenCalled();
  });

  // Regression: the API address used to be read first, so a bad email showed the general
  // error when the address was missing instead of the designed bad-email message.
  it("checks the email before reading the API address", async () => {
    const { fetchFn } = fakeFetch(async () => jsonResponse(200, { ok: true }));
    const getApiUrl = vi.fn((): string => {
      throw new Error("NEXT_PUBLIC_API_URL is not set.");
    });
    const outcome = await submitWaitlist({
      rawEmail: "ada.obi@gmail",
      getApiUrl,
      turnstileSiteKey: "",
      getBotToken: async () => "unused",
      fetchFn,
    });
    expect(outcome).toBe("invalid_email");
    expect(getApiUrl).not.toHaveBeenCalled();
  });

  it("shows the general error and sends nothing when the API address is missing", async () => {
    const { fetchFn, calls } = fakeFetch(async () => jsonResponse(200, { ok: true }));
    const outcome = await submitWaitlist({
      rawEmail: "name@example.com",
      getApiUrl: () => {
        throw new Error("NEXT_PUBLIC_API_URL is not set.");
      },
      turnstileSiteKey: "",
      getBotToken: async () => "unused",
      fetchFn,
    });
    expect(outcome).toBe("error");
    expect(calls).toHaveLength(0);
  });

  it("sends the trimmed email", async () => {
    const { fetchFn, calls } = fakeFetch(async () => jsonResponse(200, { ok: true }));
    await submitWaitlist({
      rawEmail: "  name@example.com  ",
      getApiUrl: () => API,
      turnstileSiteKey: "",
      getBotToken: async () => "unused",
      fetchFn,
    });
    expect(sentBody(calls[0]?.init)).toMatchObject({ email: "name@example.com" });
  });

  it("asks for no token and sends no bot_token when the Turnstile key is empty", async () => {
    const { fetchFn, calls } = fakeFetch(async () => jsonResponse(200, { ok: true }));
    const getBotToken = vi.fn(async () => "token");
    const outcome = await submitWaitlist({
      rawEmail: "name@example.com",
      getApiUrl: () => API,
      turnstileSiteKey: "",
      getBotToken,
      fetchFn,
    });
    expect(outcome).toBe("joined");
    expect(getBotToken).not.toHaveBeenCalled();
    expect(sentBody(calls[0]?.init)).not.toHaveProperty("bot_token");
  });

  it("sends the token as bot_token when the Turnstile key is set", async () => {
    const { fetchFn, calls } = fakeFetch(async () => jsonResponse(200, { ok: true }));
    await submitWaitlist({
      rawEmail: "name@example.com",
      getApiUrl: () => API,
      turnstileSiteKey: "site-key",
      getBotToken: async () => "token-123",
      fetchFn,
    });
    expect(sentBody(calls[0]?.init)).toEqual({
      email: "name@example.com",
      source: "launch",
      bot_token: "token-123",
    });
  });

  it("shows the general error and sends nothing when the bot check fails", async () => {
    const { fetchFn, calls } = fakeFetch(async () => jsonResponse(200, { ok: true }));
    const outcome = await submitWaitlist({
      rawEmail: "name@example.com",
      getApiUrl: () => API,
      turnstileSiteKey: "site-key",
      getBotToken: async () => {
        throw new Error("Bot check failed.");
      },
      fetchFn,
    });
    expect(outcome).toBe("error");
    expect(calls).toHaveLength(0);
  });
});

describe("button repeat-lock", () => {
  it("runs only one submit while the first is still sending", async () => {
    const singleFlight = createSingleFlight<string>();
    let release: (value: string) => void = () => undefined;
    const task = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );

    const first = singleFlight(task);
    const second = singleFlight(task);
    expect(await second).toBeUndefined();
    release("joined");
    expect(await first).toBe("joined");
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("allows a new submit once the first has finished", async () => {
    const singleFlight = createSingleFlight<string>();
    const task = vi.fn(async () => "error");
    await singleFlight(task);
    await singleFlight(task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("unlocks again after a submit throws", async () => {
    const singleFlight = createSingleFlight<string>();
    await expect(
      singleFlight(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await singleFlight(async () => "joined")).toBe("joined");
  });
});
