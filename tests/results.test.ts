import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Results } from "../components/results/ResultsScreen";
import type { FlaggedLine, ScanResultResponse } from "../lib/api/shared";
import { getContent } from "../lib/content";
import { categoryRows, getScanResult, resultView, retryLineDetail } from "../lib/scan/result";

const text = getContent("app/results");

function line(index: number): FlaggedLine {
  return {
    line_id: `l${index}`,
    section: "experience",
    index,
    index_in_section: index,
    text: `Responsible for the checkout flow ${index}.`,
    issue: "duty_not_result",
    reason: `"Responsible for" says what you did, not what changed ${index}. Add a result.`,
  };
}

function result(
  lineDetail: ScanResultResponse["line_detail"]["status"],
  counts: [number, number, number, number] = [6, 3, 4, 2],
): ScanResultResponse {
  const categories = (
    ["impact_achievements", "brevity_style", "leadership_growth", "ats_formatting"] as const
  ).map((category, index) => ({
    category,
    score: [71, 80, 77, 83][index] ?? 0,
    flagged_count: counts[index] ?? 0,
    locked: index !== 0,
  }));
  return {
    scan_session_id: "scan1",
    status: "done",
    failure: null,
    career_level_used: "mid",
    overall_score: 78,
    categories,
    line_detail: {
      status: lineDetail,
      category: lineDetail === "done" ? "impact_achievements" : null,
      lines:
        lineDetail === "done" ? Array.from({ length: counts[0] }, (_, index) => line(index)) : [],
      summary: null,
    },
    cv: [],
    passed_checks: [],
    retry_after: lineDetail === "done" ? null : 3,
  };
}

const ok = (data: ScanResultResponse) => ({ kind: "ok" as const, data });

describe("scores wait for line detail", () => {
  it("keeps the processing look while line detail runs, and checks again after retry_after", () => {
    expect(resultView(ok(result("working")), "scan1")).toEqual({
      kind: "preparing",
      delayMs: 3000,
    });
    expect(resultView(ok({ ...result("working"), retry_after: 1 }), "scan1")).toEqual({
      kind: "preparing",
      delayMs: 2000,
    });
    expect(resultView(ok(result("done")), "scan1").kind).toBe("ready");
  });
});

describe("Details failed", () => {
  it("shows when line detail failed, and Try again calls retry-detail", async () => {
    expect(resultView(ok(result("failed")), "scan1")).toEqual({ kind: "detailsFailed" });
    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify(result("working")), { status: 200 }),
    );
    await retryLineDetail("scan1", fetchFn);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(String(url)).toMatch(/\/api\/scan\/scan1\/retry-detail$/);
    expect(init?.method).toBe("POST");
  });

  it("reads the result from its own endpoint", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify(result("done")), { status: 200 }),
    );
    await getScanResult("scan1", fetchFn);
    expect(String(fetchFn.mock.calls[0]?.[0])).toMatch(/\/api\/scan\/scan1\/result$/);
  });
});

describe("B3 results", () => {
  it("shows the open category's lines: section, line and reason, three first", () => {
    const html = renderToStaticMarkup(createElement(Results, { result: result("done") }));
    expect(html).toContain("Responsible for the checkout flow 0.");
    expect(html).toContain(text.sections.experience);
    // No issue label chip: the B3 design shows only the section, the CV line and the reason.
    expect(html).not.toContain("A duty, not a result");
    expect(html).toContain("says what you did, not what changed 0");
    expect(html).not.toContain("Responsible for the checkout flow 3.");
    expect(html).toContain("Show 3 more");
    // No link back to the upload page under the categories: it is not in the B3 design.
    expect(html).not.toContain('href="/upload"');
  });

  it("shows the locked categories' score and issue count with PRO, and No issues without a lock", () => {
    const rows = categoryRows(result("done", [6, 3, 0, 2]));
    expect(rows.map((row) => row.state)).toEqual(["open", "locked", "noIssues", "locked"]);
    const html = renderToStaticMarkup(
      createElement(Results, { result: result("done", [6, 3, 0, 2]) }),
    );
    expect(html).toContain("80 · 3 issues");
    expect(html).toContain(`77 · ${text.leftRail.noIssues}`);
    expect(html.match(/>PRO</g)).toHaveLength(2);
  });

  it("locks nothing when no category has an issue", () => {
    const html = renderToStaticMarkup(
      createElement(Results, { result: { ...result("done", [0, 0, 0, 0]) } }),
    );
    expect(html).not.toContain(">PRO<");
    expect(html).toContain(text.middleDetail.noIssues.body);
  });
});
