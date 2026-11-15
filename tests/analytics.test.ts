import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_EVENTS,
  DEFAULT_POSTHOG_HOST,
  initAnalytics,
  posthogOptions,
  readAnalyticsConfig,
  resetAnalyticsForTests,
  type AnalyticsClient,
  type AnalyticsLoader,
} from "../lib/analytics";

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

  it("keeps PostHog cookie-free, recording-free and autocapture-free, with the page view on", () => {
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

  it("has no custom events: the page view is the only one (PRD FR-55, no form)", () => {
    expect(Object.keys(ANALYTICS_EVENTS)).toEqual([]);
  });
});

describe("loading PostHog", () => {
  it("does not load PostHog without a key", async () => {
    const { loader, captures } = fakeLoader();
    expect(await initAnalytics({ key: "", host: DEFAULT_POSTHOG_HOST }, NO_SIGNALS, loader)).toBe(
      "off",
    );
    expect(loader).not.toHaveBeenCalled();
    expect(captures).toHaveLength(0);
  });

  it("does not load PostHog when the browser asks not to be tracked", async () => {
    const { loader } = fakeLoader();
    expect(await initAnalytics(ON, { doNotTrack: "1" }, loader)).toBe("do_not_track");
    expect(await initAnalytics(ON, { globalPrivacyControl: true }, loader)).toBe("do_not_track");
    expect(loader).not.toHaveBeenCalled();
  });

  it("stays off when PostHog fails to load", async () => {
    const loader = vi.fn<AnalyticsLoader>(async () => {
      throw new Error("Blocked");
    });
    expect(await initAnalytics(ON, NO_SIGNALS, loader)).toBe("failed");
  });

  it("loads PostHog once with a key, even if started twice", async () => {
    const { loader, captures } = fakeLoader();
    expect(await initAnalytics(ON, NO_SIGNALS, loader)).toBe("on");
    expect(await initAnalytics(ON, NO_SIGNALS, loader)).toBe("on");
    expect(loader).toHaveBeenCalledTimes(1);
    // The page view is sent by PostHog itself (capture_pageview), never by our own capture.
    expect(captures).toHaveLength(0);
  });
});
