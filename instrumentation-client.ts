import * as Sentry from "@sentry/nextjs";
import { sentryDsn, sharedSentryOptions } from "./lib/observability/sentry";

// Browser error tracking (SRS Section 11). Starts only when NEXT_PUBLIC_SENTRY_DSN is set.
// Session replay is off: no replay integration and both replay sample rates at 0, so nothing a
// person types or sees on screen is ever recorded (PRD Section 19, analytics.md section 4).
const dsn = sentryDsn();

if (dsn !== undefined) {
  Sentry.init({
    ...sharedSentryOptions(dsn),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

// Times page-to-page navigation in the App Router. Does nothing while Sentry is off.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
