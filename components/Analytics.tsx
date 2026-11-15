"use client";

import { useEffect } from "react";
import { getAnalyticsConfig, initAnalytics } from "../lib/analytics";

/**
 * Starts PostHog once in the browser (PRD Section 19). Renders nothing. With no
 * NEXT_PUBLIC_POSTHOG_KEY, or when the browser asks not to be tracked, nothing is loaded.
 */
export function Analytics() {
  useEffect(() => {
    const signals = {
      doNotTrack: navigator.doNotTrack,
      globalPrivacyControl:
        "globalPrivacyControl" in navigator && navigator.globalPrivacyControl === true,
    };
    void initAnalytics(getAnalyticsConfig(), signals);
  }, []);
  return null;
}
