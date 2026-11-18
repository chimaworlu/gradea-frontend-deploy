import type { BrowserOptions, ErrorEvent, Event } from "@sentry/nextjs";
import { SENTRY_TRACES_SAMPLE_RATE } from "../config";

// Error tracking with Sentry (SRS Section 11 and 12), the frontend side. Off unless
// NEXT_PUBLIC_SENTRY_DSN is set, so local development, tests and builds send nothing.
// What is sent: unhandled errors in the browser, and server render and route errors.
// What is never sent (security.md section 6, AGENTS.md Section 2): cookies, headers, request
// bodies, query strings (the reset link token lives in one), form values, passwords, emails,
// CV or job description text, IP addresses, and error messages (they can repeat what was typed).
// No session replay. The only person data is the internal user id of a signed-in user.
// Expected API answers (our error codes, 4xx) are returned by lib/api/client.ts as values and
// never thrown, so they never reach Sentry; beforeSend also drops any 4xx that slips through.

/** A performance event, as Sentry passes it to beforeSendTransaction. */
type TransactionEvent = Parameters<NonNullable<BrowserOptions["beforeSendTransaction"]>>[0];

/** The public Sentry DSN, or undefined when error tracking is off. */
export function sentryDsn(): string | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ?? "";
  return dsn === "" ? undefined : dsn;
}

// Span and trace attributes that may be sent. Everything else (URLs, query strings, headers,
// addresses, element text) is removed.
const ALLOWED_SPAN_DATA = new Set([
  "http.method",
  "http.request.method",
  "http.status_code",
  "http.response.status_code",
  "http.route",
  "next.route",
  "next.span_type",
  "otel.kind",
  "sentry.op",
  "sentry.origin",
  "sentry.source",
  "sentry.sample_rate",
]);

function keepAllowed<V>(data: Record<string, V> | undefined): Record<string, V> {
  if (data === undefined) return {};
  return Object.fromEntries(Object.entries(data).filter(([key]) => ALLOWED_SPAN_DATA.has(key)));
}

/** A name or description without its query string or #hash, for example "/reset-password". */
export function withoutQuery(text: string | undefined): string | undefined {
  return text?.replace(/[?#].*$/, "");
}

/** Removes everything that could carry personal or request data. Exported for the tests. */
export function scrubEvent<T extends Event>(event: T): T {
  const method = event.request?.method;
  event.request = method === undefined ? undefined : { method };
  const userId = event.user?.id;
  event.user = userId === undefined ? undefined : { id: String(userId) };
  event.extra = undefined;
  event.message = undefined;
  event.logentry = undefined;
  event.server_name = undefined;
  event.transaction = withoutQuery(event.transaction);
  for (const value of event.exception?.values ?? []) {
    // The type and the stack frames stay; the message is never sent.
    value.value = "[not sent]";
  }
  // Breadcrumbs keep their kind and time only: no message, URL, element text or data.
  event.breadcrumbs = event.breadcrumbs?.map(({ type, category, level, timestamp }) => ({
    type,
    category,
    level,
    timestamp,
  }));
  if (event.contexts !== undefined) {
    // The response context can carry headers and cookies.
    event.contexts.response = undefined;
    const trace = event.contexts.trace;
    if (trace !== undefined) trace.data = keepAllowed(trace.data);
  }
  for (const span of event.spans ?? []) {
    span.data = keepAllowed(span.data);
    span.description = withoutQuery(span.description);
  }
  return event;
}

/** True for an answer the app expects and shows by its error code: any 4xx. */
export function isExpectedApiError(event: Event): boolean {
  const status = event.contexts?.response?.status_code;
  return typeof status === "number" && status >= 400 && status < 500;
}

export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  if (isExpectedApiError(event)) return null;
  return scrubEvent(event);
}

export function beforeSendTransaction(event: TransactionEvent): TransactionEvent {
  return scrubEvent(event);
}

/**
 * The options every runtime shares (browser, Node.js server, edge). Sentry 11 replaced
 * sendDefaultPii with dataCollection, which collects a lot by default; everything about the
 * person and the request is switched off here.
 */
export function sharedSentryOptions(dsn: string) {
  return {
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    dataCollection: {
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
    },
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    beforeSend,
    beforeSendTransaction,
  };
}
