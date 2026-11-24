import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JobDescriptionField } from "../components/scan/JobDescriptionField";
import { LimitPopup } from "../components/scan/LimitPopup";
import { ScanAction } from "../components/scan/ScanAction";
import {
  JOB_DESCRIPTION_MAX_LENGTH,
  JOB_DESCRIPTION_MIN_LENGTH,
  type AuthUser,
  type UsageResponse,
} from "../lib/api/shared";
import { errorMessage, getContent } from "../lib/content";
import {
  JOB_DESCRIPTION_CODES,
  checkJobDescription,
  uploadCv,
  uploadOutcome,
  type ScanType,
  type Viewer,
} from "../lib/scan/upload";
import { limitedScanType, usageLine } from "../lib/scan/usage";

const ROOT = join(import.meta.dirname, "..");
const text = getContent("app/upload");
const escaped = (value: string) => value.replaceAll("'", "&#x27;");

const user: AuthUser = {
  id: "u1",
  email: "someone@example.test",
  career_level: "mid",
  subscription_status: "free",
  subscription_plan: null,
  subscription_expires_at: null,
  grace_until: null,
  region: "nigeria",
  role: "user",
  created_at: "2026-11-01T00:00:00.000Z",
};
const guest: Viewer = { kind: "guest" };
const free: Viewer = { kind: "signedIn", user };
const pro: Viewer = { kind: "signedIn", user: { ...user, subscription_status: "pro" } };

function answer(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe("the job description check", () => {
  it("uses the API's limits, after the same trimming", () => {
    const problem = (value: string) => {
      const checked = checkJobDescription(value);
      return checked.kind === "problem" ? checked.code : "ok";
    };
    expect(problem("")).toBe("job_description_required");
    expect(problem("  \n ")).toBe("job_description_required");
    expect(problem("Designer wanted")).toBe("job_description_too_short");
    expect(problem(`${"a".repeat(JOB_DESCRIPTION_MIN_LENGTH - 1)}   `)).toBe(
      "job_description_too_short",
    );
    expect(problem("a".repeat(JOB_DESCRIPTION_MIN_LENGTH))).toBe("ok");
    expect(problem("a".repeat(JOB_DESCRIPTION_MAX_LENGTH))).toBe("ok");
    expect(problem("a".repeat(JOB_DESCRIPTION_MAX_LENGTH + 1))).toBe("job_description_too_long");
  });

  it("shows the problem as designed, under the text area", () => {
    const field = (problem: "job_description_too_short" | undefined) =>
      renderToStaticMarkup(
        createElement(JobDescriptionField, {
          value: "Designer wanted",
          onValueChange: () => undefined,
          problem,
        }),
      );
    expect(field("job_description_too_short")).toContain('aria-invalid="true"');
    expect(field("job_description_too_short")).toContain(
      "That looks too short to be a job description. Paste the full post.",
    );
    expect(field(undefined)).not.toContain("aria-invalid");
    expect(field(undefined)).toContain(text.jobDescription.helper);
    expect(errorMessage("job_description_too_long")).toBe(
      "That's too long. Paste only the job description.",
    );
  });

  it("shows the server's own check in the same place", async () => {
    for (const code of JOB_DESCRIPTION_CODES) {
      const result = await uploadCv(
        new File(["x"], "my-cv.pdf"),
        { jobDescription: "x" },
        answer(400, { code, message: "x" }),
      );
      expect(uploadOutcome(result)).toEqual({ kind: "jobDescriptionError", code });
    }
  });
});

describe("the button", () => {
  const button = (viewer: Viewer, scanType: ScanType, jobDescriptionMissing = false) =>
    renderToStaticMarkup(
      createElement(ScanAction, {
        viewer,
        scanType,
        hasFile: true,
        status: "idle",
        jobDescriptionMissing,
        onScan: () => undefined,
      }),
    );

  it("is Match my CV for a guest and Scan my CV for Free and PRO", () => {
    expect(button(guest, "smart_target")).toContain(">Match my CV<");
    expect(button(free, "smart_target")).toContain(">Scan my CV<");
    expect(button(pro, "smart_target")).toContain(">Scan my CV<");
    expect(button(free, "general")).toContain(">Scan my CV<");
  });

  it("shows a guest Scan my CV on General only when a CV is chosen and waiting", () => {
    const guestGeneral = (hasFile: boolean, status: "idle" | "uploading" | "failed") =>
      renderToStaticMarkup(
        createElement(ScanAction, {
          viewer: guest,
          scanType: "general",
          hasFile,
          status,
          jobDescriptionMissing: false,
          onScan: () => undefined,
        }),
      );
    // Chosen on Job-specific, then switched to General.
    expect(guestGeneral(true, "idle")).toContain(">Scan my CV<");
    // Otherwise as before: choosing a CV uploads it, with the status line or Try again.
    expect(guestGeneral(false, "idle")).toBe("");
    expect(guestGeneral(true, "uploading")).toBe("");
    expect(guestGeneral(true, "failed")).toBe("");
  });

  it("is off with its reason until a job description is added", () => {
    expect(button(guest, "smart_target", true)).toMatch(/<button[^>]* disabled=""/);
    expect(button(guest, "smart_target", true)).toContain(text.jobDescription.missing);
    expect(button(guest, "smart_target")).not.toMatch(/disabled=""/);
    expect(button(guest, "smart_target")).not.toContain(text.jobDescription.missing);
  });
});

describe("the request", () => {
  it("goes to smart-target with the job description, and General stays as it was", async () => {
    const fetchFn = answer(201, { scan_session_id: "scan1", guest: null });
    const job = "a".repeat(JOB_DESCRIPTION_MIN_LENGTH);
    await uploadCv(
      new File(["x"], "my-cv.pdf"),
      { careerLevel: "mid", jobDescription: job },
      fetchFn,
    );
    await uploadCv(new File(["x"], "my-cv.pdf"), { careerLevel: "mid" }, fetchFn);
    const [jobUrl, jobInit] = fetchFn.mock.calls[0] ?? [];
    const [generalUrl, generalInit] = fetchFn.mock.calls[1] ?? [];
    expect(String(jobUrl)).toMatch(/\/api\/scan\/smart-target$/);
    expect(String(generalUrl)).toMatch(/\/api\/scan\/general$/);
    if (!(jobInit?.body instanceof FormData) || !(generalInit?.body instanceof FormData)) {
      throw new Error("not a form");
    }
    expect(jobInit.body.get("job_description")).toBe(job);
    expect(jobInit.body.get("career_level")).toBe("mid");
    expect(generalInit.body.has("job_description")).toBe(false);
  });

  it("sends a guest to the same signup wall with the scan waiting", async () => {
    const result = await uploadCv(
      new File(["x"], "my-cv.pdf"),
      { jobDescription: "a".repeat(JOB_DESCRIPTION_MIN_LENGTH) },
      answer(201, {
        scan_session_id: "scan1",
        guest: { token: "guest-token", expires_at: "2026-11-24T12:30:00.000Z" },
      }),
    );
    expect(uploadOutcome(result).kind).toBe("wall");
  });
});

describe("the job description is never stored", () => {
  it("never reaches the files that keep something in the browser", () => {
    for (const file of ["waiting-scan.ts", "scan-file-info.ts"]) {
      const source = readFileSync(join(ROOT, "lib", "scan", file), "utf8");
      expect(source, file).not.toMatch(/job_?(description|text)/i);
    }
  });

  it("is not passed to the kept scan, the file line, an event or the address", () => {
    const source = readFileSync(join(ROOT, "components", "scan", "UploadFlow.tsx"), "utf8");
    for (const call of source.matchAll(
      /(?:saveWaitingScan|saveScanFileInfo|rememberCareerLevel|router\.push|location\.assign)\([^;]*;/g,
    )) {
      expect(call[0]).not.toMatch(/job/i);
    }
    expect(source).not.toMatch(/lib\/analytics|console\./);
  });

  it("is not kept by the browser's own form restore or sent to an online spell checker", () => {
    const html = renderToStaticMarkup(
      createElement(JobDescriptionField, {
        value: "",
        onValueChange: () => undefined,
        problem: undefined,
      }),
    );
    expect(html).toMatch(/<textarea[^>]*autoComplete="off"/i);
    expect(html).toMatch(/<textarea[^>]*spellcheck="false"/i);
  });
});

describe("the Job-specific limit", () => {
  const usage = (general: number | null, job: number | null, jobLimit: number | null = 1) => ({
    general: { used: 0, limit: general === null ? null : 5, remaining: general },
    job_specific: { used: 0, limit: job === null ? null : jobLimit, remaining: job },
    reset_at: "2026-11-30T23:00:00.000Z",
  });

  it("has its own usage line, hidden on PRO", () => {
    const data: UsageResponse = usage(4, 1);
    // reset_at is 23:00 UTC on 30 Nov, which is 1 Dec in Lagos.
    expect(usageLine(data, "smart_target")).toBe(
      "1 of 1 Job-specific scan left this month. Resets on 1 Dec.",
    );
    expect(usageLine(usage(4, 2, 3), "smart_target")).toBe(
      "2 of 3 Job-specific scans left this month. Resets on 1 Dec.",
    );
    expect(usageLine(usage(null, null), "smart_target")).toBeUndefined();
    // General keeps its own.
    expect(usageLine(data)).toBe("4 of 5 General scans left this month. Resets on 1 Dec.");
  });

  it("shows the Job-specific popup with the reset date when the API says so", async () => {
    const result = await uploadCv(
      new File(["x"], "my-cv.pdf"),
      { jobDescription: "a".repeat(JOB_DESCRIPTION_MIN_LENGTH) },
      answer(403, {
        code: "scan_limit_reached",
        message: "x",
        reset_at: "2026-11-30T23:00:00.000Z",
      }),
    );
    expect(uploadOutcome(result)).toEqual({ kind: "limit", resetAt: "2026-11-30T23:00:00.000Z" });
    const html = renderToStaticMarkup(
      createElement(LimitPopup, {
        resetAt: "2026-11-30T23:00:00.000Z",
        scanType: "smart_target",
        onClose: () => undefined,
      }),
    );
    expect(html).toContain(escaped(text.popups.jobSpecificLimitReached.title));
    expect(html).toContain("resets on 1 Dec");
  });

  it("after a claim, reads which allowance ran out from the usage, with nothing stored", () => {
    expect(limitedScanType(usage(4, 0))).toBe("smart_target");
    expect(limitedScanType(usage(0, 1))).toBe("general");
    expect(limitedScanType(usage(0, 0))).toBe("general");
  });
});
