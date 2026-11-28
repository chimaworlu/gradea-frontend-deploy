import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FeedbackPopup } from "../components/results/FeedbackPopup";
import { MoreMenu } from "../components/results/MoreMenu";
import { FEEDBACK_MESSAGE_MAX_LENGTH } from "../lib/config";
import { errorMessage, getContent } from "../lib/content";
import {
  feedbackOutcome,
  hasFeedbackText,
  resultsFeedbackPage,
  sendFeedback,
} from "../lib/feedback";

const text = getContent("app/feedback");
const MESSAGE = "The keyword chips are clear. Please add more job titles.";

function answer(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe("B8 More menu", () => {
  it("lists Dashboard and Download CV switched off, and Feedback on, in that order", () => {
    const html = renderToStaticMarkup(
      createElement(MoreMenu, {
        onFeedback: () => undefined,
        button: createRef<HTMLButtonElement>(),
        initiallyOpen: true,
      }),
    );
    const items = [...html.matchAll(/<button[^>]*role="menuitem"[^>]*>.*?<\/button>/g)].map(
      ([item]) => item,
    );
    expect(items.map((item) => item.replace(/<[^>]+>/g, ""))).toEqual([
      "Dashboard",
      "Download CV",
      "Feedback",
    ]);
    expect(items[0]).toContain('aria-disabled="true"');
    expect(items[1]).toContain('aria-disabled="true"');
    expect(items[2]).not.toContain("aria-disabled");
    // Only the arrow keys reach the items; the "..." button names the menu it opens.
    for (const item of items) expect(item).toContain('tabindex="-1"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="true"');
  });
});

describe("D4 Feedback: sending", () => {
  it("posts the message and the results page name as JSON, with no bot token", async () => {
    const fetchFn = answer(201, { ok: true });
    const result = await sendFeedback(MESSAGE, resultsFeedbackPage("smart_target"), fetchFn);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(new URL(String(url)).pathname).toBe("/api/feedback");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      message: MESSAGE,
      page: "results_job_specific",
    });
    // The message is in the body only, never in the address.
    expect(String(url)).not.toContain("keyword");
    expect(feedbackOutcome(result)).toEqual({ kind: "sent" });
    expect(resultsFeedbackPage("general")).toBe("results_general");
  });

  it("Send is on only when the box holds text", () => {
    expect(hasFeedbackText("")).toBe(false);
    expect(hasFeedbackText("  \n ")).toBe(false);
    expect(hasFeedbackText(MESSAGE)).toBe(true);
  });

  it("each error shows its own wording", async () => {
    const cases = [
      [400, "feedback_message_required"],
      [400, "feedback_message_too_long"],
      [429, "rate_limited"],
    ] as const;
    for (const [status, code] of cases) {
      const result = await sendFeedback(
        MESSAGE,
        "results_general",
        answer(status, { code, message: "x" }),
      );
      expect(feedbackOutcome(result)).toEqual({ kind: "failed", message: errorMessage(code) });
    }
    expect(errorMessage("feedback_message_too_long")).toContain("2,000");
    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(feedbackOutcome(await sendFeedback(MESSAGE, "results_general", offline))).toEqual({
      kind: "failed",
      message: getContent("shared/errors").network,
    });
  });
});

describe("D4 Feedback: what the popup shows", () => {
  const render = (initiallySent = false) =>
    renderToStaticMarkup(
      createElement(FeedbackPopup, {
        email: "someone@example.test",
        page: "results_general",
        onClose: () => undefined,
        initiallySent,
      }),
    ).replaceAll("&#x27;", "'");

  it("Empty: the form with the account email, Send off, and the box limited to 2,000", () => {
    const html = render();
    for (const words of [
      text.form.title,
      text.form.line,
      text.form.label,
      text.form.replyTo,
      text.form.replyNote,
      text.form.cancel,
    ]) {
      expect(html).toContain(words);
    }
    expect(html).toContain("someone@example.test");
    expect(html).toContain(`placeholder="${text.form.placeholder}"`);
    expect(html).toContain(`maxLength="${FEEDBACK_MESSAGE_MAX_LENGTH}"`);
    expect(FEEDBACK_MESSAGE_MAX_LENGTH).toBe(2000);
    expect(html).toMatch(/disabled=""[^>]*>Send feedback</);
    expect(html).toContain(`aria-label="${text.form.close}"`);
    expect(html).toContain('aria-modal="true"');
  });

  it("Thanks: the check, the line and a full-width Close, with no form", () => {
    const html = render(true);
    expect(html).toContain(text.thanks.title);
    expect(html).toContain(text.thanks.line);
    expect(html).toContain(`>${text.thanks.close}</button>`);
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("someone@example.test");
  });
});

describe("D4 Feedback: the message is never kept", () => {
  it("no storage, cookie, log or analytics call in the feedback code", () => {
    for (const file of [
      "components/results/FeedbackPopup.tsx",
      "components/results/MoreMenu.tsx",
      "lib/feedback.ts",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(
        /localStorage|sessionStorage|indexedDB|document\.cookie|console\.|from "[^"]*analytics"|\btrack\(/,
      );
    }
  });
});
