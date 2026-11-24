import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ScanErrorView } from "../components/scan/ScanErrorView";
import { SessionExpired } from "../components/scan/SessionExpired";
import { SCAN_GIVE_UP_SECONDS } from "../lib/config";
import { errorMessage, getContent } from "../lib/content";
import { canTryAgain, scanErrorWording } from "../lib/scan/scan-error";
import {
  getScanStatus,
  pollDelayMs,
  processingSteps,
  retryScan,
  statusView,
} from "../lib/scan/status";
import { claimOutcome, uploadOutcome } from "../lib/scan/upload";
import { saveWaitingScan, takeWaitingScanState } from "../lib/scan/waiting-scan";

function answer(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

const statusBody = (status: string, retryAfter: number | null, failure: string | null = null) => ({
  scan_session_id: "scan1",
  scan_type: "general",
  status,
  retry_after: retryAfter,
  failure,
});

describe("B1 steps follow the real status", () => {
  it("waiting reads, working checks the four categories, done prepares the results", () => {
    expect(processingSteps("waiting")).toEqual({
      reading: "current",
      checking: "pending",
      preparing: "pending",
    });
    expect(processingSteps("working")).toEqual({
      reading: "done",
      checking: "current",
      preparing: "pending",
    });
    expect(processingSteps("done")).toEqual({
      reading: "done",
      checking: "done",
      preparing: "current",
    });
  });
});

describe("polling", () => {
  it("waits the server's retry_after and never less than 2 seconds", async () => {
    const result = await getScanStatus("scan1", answer(200, statusBody("working", 3)));
    expect(statusView(result, "scan1", 4)).toEqual({
      kind: "polling",
      status: "working",
      delayMs: 3000,
    });
    expect(pollDelayMs(5)).toBe(5000);
    expect(pollDelayMs(1)).toBe(2000);
    expect(pollDelayMs(null)).toBe(2000);
  });

  it("goes to the results when the scan is done", async () => {
    const result = await getScanStatus("scan1", answer(200, statusBody("done", null)));
    expect(statusView(result, "scan1", 6)).toEqual({ kind: "done", path: "/scan/scan1/results" });
  });

  it("shows the failed screen for a scan still waiting or working too long", async () => {
    const result = await getScanStatus("scan1", answer(200, statusBody("working", 5)));
    expect(statusView(result, "scan1", SCAN_GIVE_UP_SECONDS)).toEqual({
      kind: "failed",
      reason: "stale",
    });
  });
});

describe("B2 scan error", () => {
  it("shows the AI failed wording with Try again for a scoring failure", async () => {
    const result = await getScanStatus(
      "scan1",
      answer(200, statusBody("failed", null, "scoring_failed")),
    );
    expect(statusView(result, "scan1", 9)).toEqual({ kind: "failed", reason: "scoring_failed" });
    const text = getContent("app/scan-error");
    expect(scanErrorWording("scoring_failed")).toEqual(text.scoringFailed);
    const html = renderToStaticMarkup(
      createElement(ScanErrorView, { reason: "scoring_failed", onTryAgain: () => undefined }),
    );
    expect(html).toContain(text.actions.tryAgain.default);
    expect(html).toContain(text.actions.uploadAnother);
  });

  it("uses the shared error wording for file errors from the upload, with no Try again", async () => {
    const result = await import("../lib/scan/upload").then(({ uploadCv }) =>
      uploadCv(
        new File(["x"], "cv.pdf"),
        {},
        answer(422, { code: "file_not_english", message: "x" }),
      ),
    );
    expect(uploadOutcome(result)).toEqual({ kind: "scanError", code: "file_not_english" });
    expect(scanErrorWording("file_not_english").body).toBe(errorMessage("file_not_english"));
    expect(scanErrorWording("extraction_failed").body).toBe(errorMessage("extraction_failed"));
    expect(canTryAgain("file_unreadable")).toBe(false);
    expect(canTryAgain("extraction_failed")).toBe(true);
    const html = renderToStaticMarkup(
      createElement(ScanErrorView, { reason: "file_unreadable", onTryAgain: () => undefined }),
    );
    expect(html).not.toContain(getContent("app/scan-error").actions.tryAgain.default);
  });

  it("Try again calls the retry API for this scan", async () => {
    const fetchFn = answer(200, statusBody("waiting", 2));
    const result = await retryScan("scan1", fetchFn);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(String(url)).toMatch(/\/api\/scan\/scan1\/retry$/);
    expect(init?.method).toBe("POST");
    expect(result).toEqual({ kind: "ok", data: statusBody("waiting", 2) });
  });
});

describe("D1 guest session expired", () => {
  it("shows when the claim finds the scan gone or out of time", async () => {
    const { claimScan } = await import("../lib/scan/upload");
    const result = await claimScan(
      "scan1",
      "token",
      answer(404, { code: "guest_session_invalid", message: "x" }),
    );
    expect(claimOutcome(result, "scan1")).toEqual({ kind: "expired" });

    const html = renderToStaticMarkup(createElement(SessionExpired));
    const text = getContent("app/session-expired");
    expect(html).toContain(text.heading);
    expect(html).toContain('href="/upload"');
  });

  it("shows when a kept waiting scan has run out, and clears it", () => {
    const items = new Map<string, string>();
    const storage = {
      length: 0,
      clear: () => items.clear(),
      getItem: (key: string) => items.get(key) ?? null,
      key: () => null,
      removeItem: (key: string) => void items.delete(key),
      setItem: (key: string, value: string) => void items.set(key, value),
    };
    saveWaitingScan(
      { scanSessionId: "scan1", guestToken: "t", expiresAt: "2026-11-21T12:30:00.000Z" },
      storage,
    );
    expect(takeWaitingScanState(new Date("2026-11-21T12:31:00.000Z"), storage)).toEqual({
      kind: "expired",
    });
    expect(items.size).toBe(0);
  });

  it("shows for a scan the status check no longer finds", async () => {
    const result = await getScanStatus("scan1", answer(404, { code: "not_found", message: "x" }));
    expect(statusView(result, "scan1", 1)).toEqual({ kind: "expired" });
  });
});
