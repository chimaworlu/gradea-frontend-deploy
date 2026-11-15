import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_POSTHOG_HOST,
  initAnalytics,
  posthogOptions,
  readAnalyticsConfig,
  resetAnalyticsForTests,
  track,
  trackWaitlistOutcome,
  type AnalyticsClient,
  type AnalyticsLoader,
} from "../lib/analytics";
import { submitWaitlist, type FetchFn } from "../lib/waitlist";

const ON = { key: "phc_test_key", host: DEFAULT_POSTHOG_HOST };
const NO_SIGNALS = {};

/** A fake PostHog: records each capture instead of sending anything. */
function fakeLoader() {
  const captures: Array<{ event: string; properties: Record<string, string> }> = [];
  const client: AnalyticsClient = {
    capture: (event, properties) => captures.push({ event, properties }),
  };
  const loader = vi.fn<AnalyticsLoader>(async () => client);
  return { loader, captures };
}

afterEach(() => {
  resetAnalyticsForTests();
});

describe("analytics settings", () => {
  it("is off with no key and uses the EU host by default", () => {
    expect(readAnalyticsConfig({})).toEqual({ key: "", host: DEFAULT_POSTHOG_HOST });
  });

  it("reads a key and a custom host without a trailing slash", () => {
    expect(
      readAnalyticsConfig({
        NEXT_PUBLIC_POSTHOG_KEY: " phc_abc ",
        NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com/",
      }),
    ).toEqual({ key: "phc_abc", host: "https://us.i.posthog.com" });
  });

  it("rejects a host that is not https", () => {
    expect(() => readAnalyticsConfig({ NEXT_PUBLIC_POSTHOG_HOST: "http://insecure.test" })).toThrow(
      "NEXT_PUBLIC_POSTHOG_HOST must start with https://.",
    );
  });

  it("keeps PostHog cookie-free, recording-free and autocapture-free", () => {
    expect(posthogOptions(DEFAULT_POSTHOG_HOST)).toMatchObject({
      persistence: "memory",
      autocapture: false,
      disable_session_recording: true,
      respect_dnt: true,
      capture_pageview: true,
      capture_pageleave: false,
      enable_heatmaps: false,
      disable_surveys: true,
      disable_external_dependency_loading: true,
    });
  });
});

describe("nothing is sent without a key", () => {
  it("does not load PostHog and sends nothing", async () => {
    const { loader, captures } = fakeLoader();
    expect(await initAnalytics({ key: "", host: DEFAULT_POSTHOG_HOST }, NO_SIGNALS, loader)).toBe(
      "off",
    );
    trackWaitlistOutcome("joined", "launch");
    track("waitlist_submitted", { source: "launch" });
    expect(loader).not.toHaveBeenCalled();
    expect(captures).toHaveLength(0);
  });

  it("does not load PostHog when the browser asks not to be tracked", async () => {
    const { loader, captures } = fakeLoader();
    expect(await initAnalytics(ON, { doNotTrack: "1" }, loader)).toBe("do_not_track");
    expect(await initAnalytics(ON, { globalPrivacyControl: true }, loader)).toBe("do_not_track");
    trackWaitlistOutcome("joined", "launch");
    expect(loader).not.toHaveBeenCalled();
    expect(captures).toHaveLength(0);
  });

  it("stays off and sends nothing when PostHog fails to load", async () => {
    const loader = vi.fn<AnalyticsLoader>(async () => {
      throw new Error("Blocked");
    });
    expect(await initAnalytics(ON, NO_SIGNALS, loader)).toBe("failed");
    expect(() => trackWaitlistOutcome("joined", "launch")).not.toThrow();
  });
});

describe("waitlist_submitted", () => {
  it("loads PostHog once even if started twice", async () => {
    const { loader } = fakeLoader();
    await initAnalytics(ON, NO_SIGNALS, loader);
    await initAnalytics(ON, NO_SIGNALS, loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("fires once on success with only the source", async () => {
    const { loader, captures } = fakeLoader();
    await initAnalytics(ON, NO_SIGNALS, loader);
    trackWaitlistOutcome("joined", "launch");
    expect(captures).toEqual([{ event: "waitlist_submitted", properties: { source: "launch" } }]);
  });

  it.each(["invalid_email", "rate_limited", "error"])("does not fire on %s", async (outcome) => {
    const { loader, captures } = fakeLoader();
    await initAnalytics(ON, NO_SIGNALS, loader);
    trackWaitlistOutcome(outcome, "launch");
    expect(captures).toHaveLength(0);
  });

  it("drops any property that is not on the allowed list", async () => {
    const { loader, captures } = fakeLoader();
    await initAnalytics(ON, NO_SIGNALS, loader);
    const withExtra = { source: "launch", email: "name@example.com" } as const;
    track("waitlist_submitted", withExtra);
    expect(captures[0]?.properties).toEqual({ source: "launch" });
  });

  it("never carries the email through a real submit", async () => {
    const { loader, captures } = fakeLoader();
    await initAnalytics(ON, NO_SIGNALS, loader);
    const email = "private.person@example.com";
    const fetchFn: FetchFn = async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 });
    const outcome = await submitWaitlist({
      rawEmail: `  ${email}  `,
      getApiUrl: () => "https://api.example.test",
      turnstileSiteKey: "",
      getBotToken: async () => "unused",
      fetchFn,
    });
    trackWaitlistOutcome(outcome, "launch");

    expect(captures).toHaveLength(1);
    const sent = JSON.stringify(captures);
    expect(sent).not.toContain(email);
    expect(sent).not.toContain("example.com");
  });
});
