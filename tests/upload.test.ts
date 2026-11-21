import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LimitPopup } from "../components/scan/LimitPopup";
import { CV_FILE_MAX_BYTES } from "../lib/api/shared";
import { errorMessage, getContent } from "../lib/content";
import {
  checkFiles,
  fileProblemMessage,
  resetDateLabel,
  uploadCv,
  uploadOutcome,
} from "../lib/scan/upload";

const pdf = { name: "my-cv.pdf", type: "application/pdf", size: 412 * 1024 };

function answer(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe("file checks before sending", () => {
  it("takes one PDF or DOCX up to the contract's size", () => {
    expect(checkFiles([pdf])).toEqual({ kind: "ok", file: pdf });
    const docx = { name: "CV.DOCX", type: "", size: CV_FILE_MAX_BYTES };
    expect(checkFiles([docx]).kind).toBe("ok");
  });

  it("refuses several files, a wrong type and a file over the limit, with the A1 wording", () => {
    const several = checkFiles([pdf, pdf]);
    expect(several).toEqual({ kind: "problem", problem: "several_files" });
    expect(fileProblemMessage("several_files")).toBe("Upload one CV at a time.");

    expect(checkFiles([{ name: "cv.png", type: "image/png", size: 10 }])).toEqual({
      kind: "problem",
      problem: "file_type_not_supported",
    });
    expect(checkFiles([{ ...pdf, size: CV_FILE_MAX_BYTES + 1 }])).toEqual({
      kind: "problem",
      problem: "file_too_large",
    });
    expect(fileProblemMessage("file_too_large")).toBe(errorMessage("file_too_large"));
  });
});

describe("after the upload", () => {
  it("sends a guest to the signup wall with the scan waiting, and a signed-in user to processing", async () => {
    const guest = await uploadCv(
      new File(["x"], "my-cv.pdf", { type: "application/pdf" }),
      {},
      answer(201, {
        scan_session_id: "scan1",
        guest: { token: "guest-token", expires_at: "2026-11-21T12:30:00.000Z" },
      }),
    );
    expect(uploadOutcome(guest)).toEqual({
      kind: "wall",
      scanSessionId: "scan1",
      guestToken: "guest-token",
      expiresAt: "2026-11-21T12:30:00.000Z",
    });

    const signedIn = await uploadCv(
      new File(["x"], "my-cv.pdf"),
      { careerLevel: "mid" },
      answer(201, { scan_session_id: "scan2", guest: null }),
    );
    expect(uploadOutcome(signedIn)).toEqual({
      kind: "processing",
      path: "/scan/scan2",
      scanSessionId: "scan2",
    });
  });

  it("uploads the file as a multipart form, never as JSON", async () => {
    const fetchFn = answer(201, { scan_session_id: "scan1", guest: null });
    await uploadCv(new File(["x"], "my-cv.pdf"), { careerLevel: "senior" }, fetchFn);
    const [, init] = fetchFn.mock.calls[0] ?? [];
    expect(init?.body).toBeInstanceOf(FormData);
    expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
  });
});

describe("limit reached", () => {
  it("shows the popup only on scan_limit_reached, with the reset date in Lagos time", async () => {
    const result = await uploadCv(
      new File(["x"], "my-cv.pdf"),
      {},
      // 23:00 UTC on 30 Nov is 00:00 on 1 Dec in Lagos.
      answer(403, {
        code: "scan_limit_reached",
        message: "x",
        reset_at: "2026-11-30T23:00:00.000Z",
      }),
    );
    const outcome = uploadOutcome(result);
    expect(outcome).toEqual({ kind: "limit", resetAt: "2026-11-30T23:00:00.000Z" });
    expect(resetDateLabel("2026-11-30T23:00:00.000Z")).toBe("1 Dec");

    const html = renderToStaticMarkup(
      createElement(LimitPopup, { resetAt: "2026-11-30T23:00:00.000Z", onClose: () => undefined }),
    );
    const text = getContent("app/upload").popups.limitReached;
    // renderToStaticMarkup escapes the apostrophe.
    expect(html).toContain(text.title.replace("'", "&#x27;"));
    expect(html).toContain("Your free scans reset on 1 Dec.");
    expect(html).toContain(`aria-label="${text.close}"`);
    expect(html).toContain('aria-modal="true"');
  });

  it("does not show the popup for any other error", async () => {
    const result = await uploadCv(
      new File(["x"], "my-cv.pdf"),
      {},
      answer(400, { code: "file_too_large", message: "x" }),
    );
    expect(uploadOutcome(result)).toEqual({
      kind: "fileError",
      message: errorMessage("file_too_large"),
    });
  });
});
