import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ComingSoonPage, { metadata } from "../app/page";

afterEach(() => {
  vi.restoreAllMocks();
});

// PRD FR-55: G12 has no form, collects no emails and makes no API call.
describe("G12 coming-soon page", () => {
  it("renders without a form and without any network call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const html = renderToStaticMarkup(createElement(ComingSoonPage));

    expect(html).not.toMatch(/<form|<input|<button|type="email"/);
    expect(html).not.toMatch(/turnstile|waitlist/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the tag, headline, subheading, follow line, socials and copyright in order", () => {
    const html = renderToStaticMarkup(createElement(ComingSoonPage));
    const order = [
      "Coming soon",
      "<h1",
      "Gradea grades your CV",
      "Follow us for updates.",
      'aria-label="Gradea on social media"',
      `© ${new Date().getFullYear()} Gradea`,
    ].map((part) => html.indexOf(part));

    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((left, right) => left - right)).toEqual(order);
  });

  // Gradea collects no emails, so the page must never promise one (PRD FR-55, FR-56).
  it("makes no email promise on the page or in its metadata", () => {
    const html = renderToStaticMarkup(createElement(ComingSoonPage));
    const meta = JSON.stringify(metadata);
    for (const text of [html, meta]) {
      expect(text).not.toMatch(/email you|join the list|we will email|notify/i);
    }
  });

  it("shows the agreed subheading", () => {
    const html = renderToStaticMarkup(createElement(ComingSoonPage));
    expect(html).toContain(
      "Gradea grades your CV, shows the exact lines to fix, and helps you fix them.</p>",
    );
  });
});
