import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CvPanel, PassedChecks, Results } from "../components/results/ResultsScreen";
import type { ScanResultResponse, UsageResponse } from "../lib/api/shared";
import { getContent } from "../lib/content";
import { categoryRows, cvDisplayText, lineMeta, splitEntryHeading } from "../lib/scan/result";
import { usageLine } from "../lib/scan/usage";

const text = getContent("app/results");

function result(summary: string | null): ScanResultResponse {
  return {
    scan_session_id: "scan1",
    status: "done",
    failure: null,
    career_level_used: "mid",
    overall_score: 64,
    categories: [
      { category: "impact_achievements", score: 52, flagged_count: 1, locked: false },
      { category: "brevity_style", score: 68, flagged_count: 3, locked: true },
      { category: "leadership_growth", score: 95, flagged_count: 0, locked: true },
      { category: "ats_formatting", score: 74, flagged_count: 2, locked: true },
    ],
    line_detail: {
      status: "done",
      category: "impact_achievements",
      lines: [
        {
          line_id: "l3",
          section: "experience",
          index: 3,
          index_in_section: 1,
          text: "Responsible for the checkout flow.",
          issue: "duty_not_result",
          reason: '"Responsible for" says what you did. Add a result.',
          role: "Product Designer at Acme",
        },
      ],
      summary,
    },
    cv: [
      {
        section: "contact",
        lines: [
          {
            line_id: "l0",
            section: "contact",
            index_in_section: 0,
            kind: "heading",
            text: "Ada Example",
            flagged: false,
          },
        ],
      },
      {
        section: "experience",
        lines: [
          {
            line_id: "l2",
            section: "experience",
            index_in_section: 0,
            kind: "heading",
            text: "Experience",
            flagged: false,
          },
          {
            line_id: "l3",
            section: "experience",
            index_in_section: 1,
            kind: "bullet",
            text: "Responsible for the checkout flow.",
            role: "Product Designer at Acme",
            flagged: true,
          },
          {
            line_id: "l4",
            section: "experience",
            index_in_section: 2,
            kind: "bullet",
            text: "Wrote short release notes.",
            flagged: false,
          },
        ],
      },
    ],
    passed_checks: ["contact_details_present", "every_role_has_dates"],
    retry_after: null,
  };
}

describe("B3 CV panel", () => {
  it("highlights the open category's flagged lines, and marks nothing for a locked one", () => {
    const data = result(null);
    const [open, locked] = categoryRows(data);
    if (open === undefined || locked === undefined) throw new Error("rows missing");
    const openHtml = renderToStaticMarkup(
      createElement(CvPanel, { result: data, row: open, activeLine: undefined }),
    );
    expect(openHtml.match(/data-flagged="true"/g)).toHaveLength(1);
    expect(openHtml).toContain("Flagged in Impact &amp; Achievements");
    // The note's flag is styled amber (the warning colour), as in the design.
    expect(openHtml).toContain('data-kind="flagged"');
    const lockedHtml = renderToStaticMarkup(
      createElement(CvPanel, { result: data, row: locked, activeLine: undefined }),
    );
    expect(lockedHtml).not.toContain('data-flagged="true"');
    expect(lockedHtml).toContain("Highlights for Brevity &amp; Style unlock with PRO");
    // The whole CV still shows.
    expect(lockedHtml).toContain("Wrote short release notes.");
  });
});

describe("B3 line cards and summary", () => {
  it("shows the section with the role, or the section alone when there is none", () => {
    expect(lineMeta({ section: "experience", role: "Product Designer at Acme" })).toBe(
      "Experience, Product Designer at Acme",
    );
    expect(lineMeta({ section: "skills" })).toBe(text.sections.skills);
  });

  it("shows the summary only when the server sent one", () => {
    const sentence = "Your bullets list duties more than results.";
    expect(renderToStaticMarkup(createElement(Results, { result: result(sentence) }))).toContain(
      sentence,
    );
    expect(renderToStaticMarkup(createElement(Results, { result: result(null) }))).not.toContain(
      sentence,
    );
  });
});

describe("B3 passed checks", () => {
  it("lists each check in plain words, and hides the section when there are none", () => {
    const html = renderToStaticMarkup(
      createElement(PassedChecks, { checks: ["contact_details_present", "every_role_has_dates"] }),
    );
    expect(html).toContain(text.middleDetail.passedChecks.heading);
    expect(html).toContain(text.middleDetail.passedChecks.checks.every_role_has_dates);
    expect(renderToStaticMarkup(createElement(PassedChecks, { checks: [] }))).toBe("");
  });
});

describe("A1 usage line", () => {
  const usage = (limit: number | null, remaining: number | null): UsageResponse => ({
    general: { used: 1, limit, remaining },
    job_specific: { used: 0, limit: 1, remaining: 1 },
    // 23:00 UTC on 30 Nov is 00:00 on 1 Dec in Lagos.
    reset_at: "2026-11-30T23:00:00.000Z",
  });

  it("says how many General scans are left and when they reset, in Lagos time", () => {
    expect(usageLine(usage(5, 4))).toBe("4 of 5 General scans left this month. Resets on 1 Dec.");
  });

  it("is hidden on a PRO plan, which has no monthly limit", () => {
    expect(usageLine(usage(null, null))).toBeUndefined();
  });
});

describe("B3 CV panel display", () => {
  it("splits an entry heading into its title and its trailing date range", () => {
    expect(
      splitEntryHeading("Product Designer, EverTry (Fintech), Lagos, Nigeria May 2026 to Present"),
    ).toEqual({
      title: "Product Designer, EverTry (Fintech), Lagos, Nigeria",
      dates: "May 2026 to Present",
    });
    expect(
      splitEntryHeading("Product Designer | Squama Marketing | Toronto   March 2026 to Present"),
    ).toEqual({
      title: "Product Designer, Squama Marketing, Toronto",
      dates: "March 2026 to Present",
    });
    expect(splitEntryHeading("Designer, Beta Studio, Jan 2024 - Mar 2025")).toEqual({
      title: "Designer, Beta Studio",
      dates: "Jan 2024 - Mar 2025",
    });
    expect(splitEntryHeading("Product Design Bootcamp, Dev and Design HQ 2025")).toEqual({
      title: "Product Design Bootcamp, Dev and Design HQ",
      dates: "2025",
    });
  });

  it("shows a heading with no clear date range at the end whole", () => {
    expect(
      splitEntryHeading("UXLens AI | Product Designer and Builder | Case study | Live"),
    ).toBeUndefined();
    expect(splitEntryHeading("Product Designer at Acme")).toBeUndefined();
  });

  it("names sections from the content files and shows contact separators as dots", () => {
    const heading = {
      line_id: "h",
      section: "experience" as const,
      index_in_section: 0,
      kind: "heading" as const,
      text: "WORK EXPERIENCE",
      flagged: false,
    };
    expect(cvDisplayText(heading, true)).toBe(text.sections.experience);
    expect(
      cvDisplayText(
        { ...heading, section: "contact", kind: "text", text: "+234 700 | ada@example.test" },
        false,
      ),
    ).toBe("+234 700 · ada@example.test");
  });
});
