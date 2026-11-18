import * as Sentry from "@sentry/nextjs";
import { sentryDsn, sharedSentryOptions } from "./lib/observability/sentry";

// Server and edge error tracking (SRS Section 11). Next.js calls register() once when a server
// starts. Starts only when NEXT_PUBLIC_SENTRY_DSN is set.
export function register() {
  const dsn = sentryDsn();
  if (dsn === undefined) return;
  Sentry.init({
    ...sharedSentryOptions(dsn),
    // Never read request bodies or local variables (they can hold form values).
    includeLocalVariables: false,
  });
}

// Reports errors thrown while rendering a page or running a route on the server. A 404 from
// notFound() and redirects are not errors and are not reported. Does nothing while Sentry is off.
export const onRequestError = Sentry.captureRequestError;
