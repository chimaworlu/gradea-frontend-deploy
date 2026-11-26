import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JobResults } from "../components/results/JobResults";
import { ProcessingMain } from "../components/scan/ScanProcessing";
import { SignupWall } from "../components/scan/SignupWall";
import {
  KeywordGroup,
  ScoreCategory,
  type JobResultResponse,
  type ScanResultResponse,
  type ScanType,
} from "../lib/api/shared";
import {
  checkingStepLabel,
  getContent,
  keywordGroupLabel,
  scoreCategoryLabel,
} from "../lib/content";
import { getScanResult, resultView, type ScoredJobResult } from "../lib/scan/result";

const text = getContent("app/job-results");

function job(changes: Partial<ScoredJobResult> = {}): ScoredJobResult {
  return {
    scan_type: "smart_target",
    scan_session_id: "scan1",
    status: "done",
    failure: null,
    career_level_used: "mid",
    relevancy_score: 72,
    summary: "Your CV shows 4 of the 7 things this job asks for.",
    keyword_groups: [
      {
        group: "hard_skills",
        matched_count: 2,
        missing_count: 2,
        matched: ["Prototyping", "User research"],
        missing: [],
      },
      {
        group: "soft_skills",
        matched_count: 2,
        missing_count: 0,
        matched: ["Ownership", "Communication"],
        missing: [],
      },
      {
        group: "titles_certifications_tools",
        matched_count: 0,
        missing_count: 1,
        matched: [],
        missing: [],
      },
      {
        group: "industry_language",
        matched_count: 0,
        missing_count: 0,
        matched: [],
        missing: [],
      },
    ],
    missing_locked: true,
    tailor_groups: [],
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
    ],
    retry_after: null,
    ...changes,
  };
}

const render = (result: ScoredJobResult) =>
  renderToStaticMarkup(createElement(JobResults, { result }));

const general: ScanResultResponse = {
  scan_session_id: "scan1",
  status: "done",
  failure: null,
  career_level_used: "mid",
  overall_score: 64,
  categories: [],
  line_detail: {
    status: "done",
    category: null,
    lines: [],
    summary: null,
    file_issues: [],
  },
  cv: [],
  passed_checks: [],
  retry_after: null,
};

describe("C1 Relevancy score", () => {
  it("is amber below 75 and green from 75", () => {
    expect(render(job({ relevancy_score: 74 }))).toContain('data-tone="flagged"');
    expect(render(job({ relevancy_score: 75 }))).toContain('data-tone="strong"');
    expect(render(job())).toContain(">72%<");
    expect(render(job())).toContain(text.rail.relevancyScore);
  });
});

describe("C1 keyword match", () => {
  it("shows the headline, each group's count and the matched keywords as chips", () => {
    const html = render(job());
    expect(html).toContain("You match 4 of 7 keywords from this job description.");
    expect(html).toContain(">2 of 4<");
    expect(html).toContain(">2 of 2<");
    for (const keyword of ["Prototyping", "User research", "Ownership", "Communication"]) {
      expect(html).toContain(keyword);
    }
    // None matched: the count with no chips. A group with no keywords is hidden.
    expect(html).toContain(">0 of 1<");
    expect(html).not.toContain(keywordGroupLabel("industry_language"));
    expect(html.match(/aria-label="Matched keywords in/g)).toHaveLength(2);
  });

  it("shows the locked card with the real count only when locked and something is missing", () => {
    expect(render(job())).toContain(
      "3 keywords from the job are missing from your CV. Unlock PRO to see them and add them with Magic Write.",
    );
    const [hard] = job().keyword_groups;
    if (hard === undefined) throw new Error("group missing");
    const one = render(job({ keyword_groups: [{ ...hard, missing_count: 1 }] }));
    expect(one).toContain("1 keyword from the job is missing from your CV.");
    const none = render(job({ keyword_groups: [{ ...hard, missing_count: 0 }] }));
    expect(none).not.toContain(text.missingKeywords.heading);
    expect(none).not.toContain("missing");
    const pro = render(job({ missing_locked: false }));
    expect(pro).not.toContain(text.missingKeywords.heading);
    expect(pro).not.toContain(text.missingKeywords.pro);
    expect(pro).toContain("2 missing");
  });

  it("never renders a missing keyword or its reason, whatever the answer carries", () => {
    const groups = job().keyword_groups.map((group) => ({
      ...group,
      missing: [{ keyword: "Secret keyword", reason: "Secret reason." }],
    }));
    for (const missing_locked of [true, false]) {
      const html = render(job({ keyword_groups: groups, missing_locked }));
      expect(html).not.toContain("Secret");
    }
  });

  it("shows the CV plain, with no highlight", () => {
    const marked = job().cv.map((group) => ({
      ...group,
      lines: group.lines.map((line) => ({ ...line, flagged: true })),
    }));
    const html = render(job({ cv: marked }));
    expect(html).toContain("Ada Example");
    expect(html).not.toContain("data-flagged");
  });
});

describe("the view for each kind of scan", () => {
  const ask = async (body: JobResultResponse | ScanResultResponse) =>
    resultView(
      await getScanResult(
        "scan1",
        vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status: 200 })),
      ),
      "scan1",
    );

  it("is C1 for a Job-specific result and B3 for General", async () => {
    expect(await ask(job())).toEqual({ kind: "jobReady", result: job() });
    expect((await ask(general)).kind).toBe("ready");
  });

  it("goes back to processing until a Job-specific scan is scored, and never waits for details", async () => {
    const waiting: JobResultResponse = {
      ...job(),
      status: "working",
      relevancy_score: null,
      summary: null,
      keyword_groups: [],
      cv: [],
      retry_after: 3,
    };
    expect(await ask(waiting)).toEqual({ kind: "notScored", path: "/scan/scan1" });
    // A done scan with no score shows no made-up score.
    expect((await ask({ ...job(), relevancy_score: null })).kind).toBe("retryLater");
  });
});

describe("the wording for each kind of scan", () => {
  const processing = (scanType: ScanType | undefined) =>
    renderToStaticMarkup(
      createElement(ProcessingMain, {
        status: "working",
        scanType,
        file: undefined,
        takingLonger: false,
      }),
    );
  const wall = (scanType: ScanType) =>
    renderToStaticMarkup(
      createElement(SignupWall, {
        scanType,
        fileName: "my-cv.pdf",
        fileSize: 412 * 1024,
        onSignedUp: () => undefined,
        onCareerLevelChange: () => undefined,
      }),
    ).replaceAll("&amp;", "&");

  it("names the four categories on processing for General only", () => {
    expect(processing("general")).toContain("Checking the four categories");
    expect(processing("smart_target")).toContain("Matching your CV to the job");
    expect(processing("smart_target")).not.toContain("four categories");
    // Before the first answer: a line true of both.
    expect(processing(undefined)).toContain(checkingStepLabel(undefined));
    expect(processing(undefined)).not.toMatch(/four categories|the job/);
  });

  it("previews the categories on the wall for General and the keyword groups for Job-specific", () => {
    for (const category of ScoreCategory.options) {
      expect(wall("general")).toContain(scoreCategoryLabel(category));
      expect(wall("smart_target")).not.toContain(scoreCategoryLabel(category));
    }
    for (const group of KeywordGroup.options) {
      expect(wall("smart_target")).toContain(keywordGroupLabel(group));
      expect(wall("general")).not.toContain(keywordGroupLabel(group));
    }
    expect(wall("smart_target")).toContain(text.rail.relevancyScore);
    expect(wall("general")).toContain(getContent("app/signup-wall").preview.overallScore);
  });

  it("gives the wall its own heading and line for each kind of scan", () => {
    const generalWords = [
      "Your CV grade is one step away",
      "Create a free account to see your grade. It takes a few seconds.",
    ];
    const jobWords = [
      "Your job match is one step away",
      "Create a free account to see how your CV matches the job. It takes a few seconds.",
    ];
    for (const words of generalWords) {
      expect(wall("general")).toContain(words);
      expect(wall("smart_target")).not.toContain(words);
    }
    for (const words of jobWords) {
      expect(wall("smart_target")).toContain(words);
      expect(wall("general")).not.toContain(words);
    }
  });
});
