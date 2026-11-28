import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RescorePopup, type RescorePopupProps } from "../components/results/RescorePopup";
import { GUEST_TOKEN_HEADER, type UsageResponse } from "../lib/api/shared";
import { errorMessage, getContent } from "../lib/content";
import { currentScoreLabel, rescoreCheck } from "../lib/scan/rescore";
import { rescanCv, uploadOutcome } from "../lib/scan/upload";

const text = getContent("app/rescore");
const upload = getContent("app/upload");
const JOB = "Product Designer on a payments team. ".repeat(5);

function answer(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

/** The path, form and headers of the one request sent. */
function sent(fetchFn: ReturnType<typeof answer>) {
  const [url, init] = fetchFn.mock.calls[0] ?? [];
  const body = init?.body;
  if (!(body instanceof FormData)) throw new Error("not a form");
  return { path: new URL(String(url)).pathname, form: body, headers: new Headers(init?.headers) };
}

describe("the switch scans the same CV again by its id, with no file", () => {
  it("to General: the scan id alone, to /api/scan/general", async () => {
    const fetchFn = answer(201, { scan_session_id: "scan2", guest: null });
    const result = await rescanCv("scan1", {}, fetchFn);
    const { path, form, headers } = sent(fetchFn);
    expect(path).toBe("/api/scan/general");
    expect(form.get("scan_session_id")).toBe("scan1");
    expect(form.has("file")).toBe(false);
    expect(form.has("job_description")).toBe(false);
    expect(headers.has(GUEST_TOKEN_HEADER)).toBe(false);
    expect(uploadOutcome(result)).toEqual({
      kind: "processing",
      path: "/scan/scan2",
      scanSessionId: "scan2",
    });
  });

  it("to Job-specific: the scan id and the job description, to /api/scan/smart-target", async () => {
    const fetchFn = answer(201, { scan_session_id: "scan3", guest: null });
    await rescanCv("scan1", { jobDescription: JOB, careerLevel: "mid" }, fetchFn);
    const { path, form } = sent(fetchFn);
    expect(path).toBe("/api/scan/smart-target");
    expect(form.get("scan_session_id")).toBe("scan1");
    expect(form.get("job_description")).toBe(JOB);
    expect(form.get("career_level")).toBe("mid");
    expect(form.has("file")).toBe(false);
  });

  it("a guest sends the scan's token in its header, never in the address or the form", async () => {
    const fetchFn = answer(201, { scan_session_id: "scan2", guest: null });
    await rescanCv("scan1", { guestToken: "guest-token" }, fetchFn);
    const { form, headers } = sent(fetchFn);
    const [url] = fetchFn.mock.calls[0] ?? [];
    expect(headers.get(GUEST_TOKEN_HEADER)).toBe("guest-token");
    expect(String(url)).not.toContain("guest-token");
    expect([...form.values()]).not.toContain("guest-token");
  });

  it("a scan that is gone is not found, with the error wording and the upload page offered", async () => {
    const result = await rescanCv("gone", {}, answer(404, { code: "not_found", message: "x" }));
    expect(uploadOutcome(result)).toEqual({
      kind: "scanNotFound",
      message: errorMessage("not_found"),
    });
  });
});

describe("B6 Re-score popup: when Scan my CV is on", () => {
  it("re-scoring the page's own mode needs a new CV", () => {
    const base = { pageType: "general", mode: "general", jobText: "" } as const;
    expect(rescoreCheck({ ...base, hasFile: false })).toEqual({ kind: "blocked", reason: "file" });
    expect(rescoreCheck({ ...base, hasFile: true })).toEqual({ kind: "ready" });
  });

  it("the other mode can use the CV from these results; Job-specific needs the job description", () => {
    const toJob = { pageType: "general", mode: "smart_target", hasFile: false } as const;
    expect(rescoreCheck({ ...toJob, jobText: "  " })).toEqual({
      kind: "blocked",
      reason: "jobDescription",
    });
    expect(rescoreCheck({ ...toJob, jobText: JOB })).toEqual({ kind: "ready" });
    // Too short is said when the button is pressed, as on A1, so the button stays on.
    expect(rescoreCheck({ ...toJob, jobText: "Too short." })).toEqual({ kind: "ready" });
    const toGeneral = { pageType: "smart_target", mode: "general", hasFile: false } as const;
    expect(rescoreCheck({ ...toGeneral, jobText: "" })).toEqual({ kind: "ready" });
  });

  it("the chip names the score's mode once the popup is on the other one", () => {
    expect(currentScoreLabel("74", "general", "general")).toBe("Current score: 74");
    expect(currentScoreLabel("74", "general", "smart_target")).toBe(
      "Current score: 74 (General)",
    );
    expect(currentScoreLabel("72%", "smart_target", "general")).toBe(
      "Current score: 72% (Job-specific)",
    );
  });
});

describe("B6 Re-score popup: what it shows", () => {
  const usage: UsageResponse = {
    general: { used: 1, limit: 5, remaining: 4 },
    job_specific: { used: 0, limit: 1, remaining: 1 },
    reset_at: "2026-11-30T23:00:00.000Z",
  };
  const render = (changes: Partial<RescorePopupProps>) =>
    renderToStaticMarkup(
      createElement(RescorePopup, {
        pageType: "general",
        scanSessionId: "scan1",
        score: "74",
        mode: "general",
        onModeChange: () => undefined,
        careerLevel: "entry",
        usage,
        onClose: () => undefined,
        onStarted: () => undefined,
        onLimit: () => undefined,
        ...changes,
      }),
    );

  it("General: the A1 box and the scans line, and the button off until a CV is chosen", () => {
    const html = render({});
    expect(html).toContain(text.popup.title);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain(upload.modeSwitch.generalHelper);
    expect(html).toContain("Current score: 74<");
    expect(html).toContain(upload.uploadBox.title);
    expect(html).toContain("Career level: <span");
    expect(html).toContain("Entry-level");
    expect(html).toContain("4 of 5 General scans left this month.");
    expect(html).toContain(text.popup.fileMissing);
    expect(html).toMatch(/disabled=""[^>]*aria-describedby="rescore-note"/);
    expect(html).not.toContain(upload.jobDescription.label);
    expect(html).not.toContain(text.popup.sameCv);
  });

  it("Job-specific from General: the job description box, From a link off, and no file needed", () => {
    const html = render({ mode: "smart_target" });
    expect(html).toContain(upload.jobDescription.label);
    expect(html).toContain(upload.modeSwitch.jobSpecificHelper);
    expect(html).toMatch(/aria-pressed="false" disabled=""><span>From a link/);
    expect(html).toContain("Current score: 74 (General)");
    expect(html).toContain(text.popup.sameCv);
    expect(html).toContain("1 of 1 Job-specific scan left this month.");
    expect(html).toContain(upload.jobDescription.missing);
    expect(html).not.toContain(text.popup.fileMissing);
    // The text area never offers to keep the text (PRD FR-54).
    expect(html).toMatch(/<textarea[^>]*autoComplete="off"[^>]*spellcheck="false"/i);
  });

  it("PRO: no scans line", () => {
    const pro: UsageResponse = {
      general: { used: 9, limit: null, remaining: null },
      job_specific: { used: 2, limit: null, remaining: null },
      reset_at: usage.reset_at,
    };
    expect(render({ usage: pro })).not.toContain("left this month");
  });
});
