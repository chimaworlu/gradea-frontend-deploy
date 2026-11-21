import type { z } from "zod";
import { ErrorResponse, type ErrorCode } from "./shared";

// The one way the frontend talks to gradea-backend (api-contract.md). Every answer is checked
// against the shared Zod schemas before it is used. Request and response bodies are never
// logged: they carry emails and passwords (security.md section 6).

/** Local development address of gradea-backend (its .env.example PORT). */
export const DEFAULT_API_URL = "http://localhost:4000";

/**
 * The API address for this environment, without a trailing slash. One setting per environment
 * (AGENTS.md Section 3). Read as process.env.NEXT_PUBLIC_API_URL so Next.js inlines it.
 */
export function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  return (configured === "" ? DEFAULT_API_URL : configured).replace(/\/+$/, "");
}

/** The full address of an API path, for example apiUrl("/api/auth/google"). */
export function apiUrl(path: `/${string}`): string {
  return `${apiBaseUrl()}${path}`;
}

/**
 * What a call can end in. A network failure never reached the server, so it has no code.
 * resetAt is there only with scan_limit_reached: when the monthly allowance starts again.
 */
export type ApiResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "error"; code: ErrorCode; resetAt?: string }
  | { kind: "network" };

export type ApiRequest<S extends z.ZodType> = {
  method: "GET" | "POST";
  path: `/${string}`;
  /** Sent as JSON. Leave out for a request with no body. */
  body?: unknown;
  /** Sent as a multipart form instead of JSON, for example the CV upload. */
  form?: FormData;
  /** Extra request headers, for example the guest token on a scan claim. */
  headers?: Record<string, string>;
  /** The shared schema the success answer must match. */
  response: S;
  /** For tests. Defaults to the browser's fetch. */
  fetchFn?: typeof fetch;
};

export async function apiRequest<S extends z.ZodType>(
  request: ApiRequest<S>,
): Promise<ApiResult<z.infer<S>>> {
  const fetchFn = request.fetchFn ?? fetch;
  const hasBody = request.body !== undefined;
  const headers: Record<string, string> = { Accept: "application/json", ...request.headers };
  // A multipart form sets its own Content-Type with the boundary, so it is never set here.
  if (hasBody && request.form === undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  let text: string;
  try {
    response = await fetchFn(apiUrl(request.path), {
      method: request.method,
      // The session cookie is httpOnly and set by the API, so it must travel with every call.
      credentials: "include",
      headers,
      body: request.form ?? (hasBody ? JSON.stringify(request.body) : undefined),
    });
    text = await response.text();
  } catch {
    // Only thrown when no full answer came back (offline, DNS, CORS, a dropped connection).
    // Shown as its own message; nothing about the request is logged.
    return { kind: "network" };
  }

  const json = parseJson(text);

  if (response.ok) {
    const parsed = request.response.safeParse(json);
    // An answer that does not match the contract is never used (coding-standards Section 2).
    return parsed.success
      ? { kind: "ok", data: parsed.data }
      : { kind: "error", code: "internal_error" };
  }

  const error = ErrorResponse.safeParse(json);
  if (!error.success) return { kind: "error", code: "internal_error" };
  const { code, reset_at: resetAt } = error.data;
  return resetAt === undefined ? { kind: "error", code } : { kind: "error", code, resetAt };
}

/**
 * The body as JSON. An empty or non-JSON body becomes undefined, which every schema rejects,
 * so the caller gets internal_error, never made-up data.
 */
function parseJson(text: string): unknown {
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
