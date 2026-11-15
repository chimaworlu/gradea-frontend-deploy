/**
 * Usage analytics through PostHog (PRD Section 19, .claude/rules/analytics.md).
 * Actions, never content: no email, no typed text, no CV or job description text, ever.
 *
 * Events (name: allowed properties). Add a new event here first, with its allowed properties,
 * then call track(...) where it happens. Any property not listed is dropped before sending.
 *   $pageview           (none)      Sent by PostHog itself on each page load.
 *   waitlist_submitted  source      A waitlist join succeeded. source: "launch" (G12).
 *
 * Off unless NEXT_PUBLIC_POSTHOG_KEY is set. With no key (local, CI, tests) posthog-js is not
 * even loaded and nothing is sent. It is also not loaded when the browser asks not to be
 * tracked (Do Not Track or Global Privacy Control).
 * Privacy settings: memory-only persistence (no cookie, no local storage), no session
 * recording, no autocapture of clicks or text, no heatmaps, surveys or remote scripts.
 */
import type { PostHogConfig } from "posthog-js";

export const ANALYTICS_EVENTS = {
  waitlist_submitted: ["source"],
} as const satisfies Record<string, readonly string[]>;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;

/** The typed properties each event may carry. Must match ANALYTICS_EVENTS above. */
export type AnalyticsEventProperties = {
  waitlist_submitted: { source: "launch" };
};

export const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";

export type AnalyticsConfig = { key: string; host: string };

export type AnalyticsEnv = {
  NEXT_PUBLIC_POSTHOG_KEY?: string | undefined;
  NEXT_PUBLIC_POSTHOG_HOST?: string | undefined;
};

/** An empty key means analytics is fully off. The host defaults to PostHog's EU cloud. */
export function readAnalyticsConfig(env: AnalyticsEnv): AnalyticsConfig {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? "";
  const rawHost = env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ?? "";
  const host = (rawHost === "" ? DEFAULT_POSTHOG_HOST : rawHost).replace(/\/+$/, "");
  if (new URL(host).protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_POSTHOG_HOST must start with https://.");
  }
  return { key, host };
}

/** Next.js inlines NEXT_PUBLIC_ values only when they are read by their full literal name. */
export function getAnalyticsConfig(): AnalyticsConfig {
  return readAnalyticsConfig({
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });
}

/** The PostHog settings that keep the site cookie-free and content-free (PRD Section 19). */
export function posthogOptions(host: string): Partial<PostHogConfig> {
  return {
    api_host: host,
    persistence: "memory",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: false,
    disable_session_recording: true,
    respect_dnt: true,
    person_profiles: "identified_only",
    rageclick: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_performance: false,
    enable_heatmaps: false,
    disable_surveys: true,
    disable_web_experiments: true,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
  };
}

/** The one door events go through. */
export type AnalyticsClient = {
  capture: (event: string, properties: Record<string, string>) => void;
};

export type AnalyticsLoader = (config: AnalyticsConfig) => Promise<AnalyticsClient>;

export type AnalyticsStatus = "on" | "off" | "do_not_track" | "failed";

let client: AnalyticsClient | null = null;
let started = false;

/** Loads posthog-js (only when there is a key) and starts it with the privacy settings. */
const loadPosthog: AnalyticsLoader = async ({ key, host }) => {
  const { default: posthog } = await import("posthog-js");
  posthog.init(key, posthogOptions(host));
  return { capture: (event, properties) => posthog.capture(event, properties) };
};

export type BrowserPrivacySignals = {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
};

/** True when the visitor's browser asks not to be tracked. */
export function browserAsksNotToTrack(signals: BrowserPrivacySignals): boolean {
  return (
    signals.doNotTrack === "1" ||
    signals.doNotTrack === "yes" ||
    signals.globalPrivacyControl === true
  );
}

/**
 * Starts analytics once. Does nothing without a key or when the browser asks not to be
 * tracked. A blocked or failed load leaves analytics off; the page works the same.
 */
export async function initAnalytics(
  config: AnalyticsConfig,
  signals: BrowserPrivacySignals,
  loader: AnalyticsLoader = loadPosthog,
): Promise<AnalyticsStatus> {
  if (config.key === "") {
    return "off";
  }
  if (browserAsksNotToTrack(signals)) {
    return "do_not_track";
  }
  if (started) {
    return client === null ? "failed" : "on";
  }
  started = true;
  try {
    client = await loader(config);
    return "on";
  } catch {
    // Blocked by an ad blocker or offline: analytics stays off and the page is unaffected.
    client = null;
    return "failed";
  }
}

/**
 * Sends one event with only its allowed properties. Does nothing while analytics is off.
 * The property type stops content being passed; the allowlist drops anything extra.
 */
export function track<E extends AnalyticsEvent>(
  event: E,
  properties: AnalyticsEventProperties[E],
): void {
  if (client === null) {
    return;
  }
  const allowed: readonly string[] = ANALYTICS_EVENTS[event];
  const safe: Record<string, string> = {};
  for (const [name, value] of Object.entries(properties)) {
    if (allowed.includes(name) && typeof value === "string") {
      safe[name] = value;
    }
  }
  client.capture(event, safe);
}

/** Sends waitlist_submitted only when the join succeeded. Never the email. */
export function trackWaitlistOutcome(outcome: string, source: "launch"): void {
  if (outcome === "joined") {
    track("waitlist_submitted", { source });
  }
}

/** Test helper: forgets the started client so each test starts clean. */
export function resetAnalyticsForTests(): void {
  client = null;
  started = false;
}
