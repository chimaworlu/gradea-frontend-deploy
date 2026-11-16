import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SocialLinks } from "../components/SocialLinks";
import { getContent } from "../lib/content";
import { selectShownSocials, toSocialItems, type SocialItem } from "../lib/socials";

const content = getContent("marketing/coming-soon");
const contentItems = toSocialItems(content.socials.items);

function item(network: SocialItem["network"], visible: boolean, url = ""): SocialItem {
  return { network, name: network, url, visible };
}

function render(items: readonly SocialItem[]): string {
  return renderToStaticMarkup(
    createElement(SocialLinks, {
      listLabel: content.socials.listLabel,
      linkLabel: content.socials.linkLabel,
      items,
    }),
  );
}

/** Every <a ...> opening tag in the markup, in order. */
function anchors(html: string): string[] {
  return html.match(/<a [^>]*>/g) ?? [];
}

describe("social icons on the coming-soon page", () => {
  it("shows LinkedIn, TikTok, YouTube and X in that order", () => {
    expect(selectShownSocials(contentItems).map((social) => social.network)).toEqual([
      "linkedin",
      "tiktok",
      "youtube",
      "x",
    ]);
  });

  it("renders four real links, in order, each with its url, a new tab and a label", () => {
    const links = anchors(render(selectShownSocials(contentItems)));
    const expected = [
      ["https://www.linkedin.com/company/usegradea", "Gradea on LinkedIn"],
      ["https://www.tiktok.com/@usegradea", "Gradea on TikTok"],
      ["https://www.youtube.com/@usegradea", "Gradea on YouTube"],
      ["https://x.com/usegradea", "Gradea on X"],
    ];
    expect(links).toHaveLength(expected.length);
    expected.forEach(([url, label], index) => {
      const link = links[index] ?? "";
      expect(link).toContain(`href="${url}"`);
      expect(link).toContain('target="_blank"');
      expect(link).toContain('rel="noopener noreferrer"');
      expect(link).toContain(`aria-label="${label}"`);
    });
  });

  it("never shows Facebook or Instagram while they are not visible, even with a url", () => {
    const items = [
      item("facebook", false, "https://example.test/fb"),
      item("instagram", false, "https://example.test/ig"),
    ];
    expect(selectShownSocials(items)).toEqual([]);
    const html = render(selectShownSocials(contentItems));
    expect(html).not.toMatch(/facebook|instagram/i);
  });

  it("does not show a visible icon whose url is empty", () => {
    const items = [
      item("linkedin", true, "https://example.test/in"),
      item("tiktok", true),
      item("youtube", true, "https://example.test/yt"),
      item("x", true),
    ];
    expect(selectShownSocials(items).map((social) => social.network)).toEqual([
      "linkedin",
      "youtube",
    ]);
  });

  it("renders nothing for an item with an empty url, even if passed in directly", () => {
    const html = render([item("linkedin", true, "https://example.test/in"), item("x", true)]);
    expect(anchors(html)).toHaveLength(1);
    expect(html.match(/<li/g)).toHaveLength(1);
    expect(render([item("x", true)])).toBe("");
  });

  it("rejects an unknown network in the content file", () => {
    expect(() =>
      toSocialItems([{ network: "myspace", name: "Myspace", url: "", visible: true }]),
    ).toThrow("Unknown social network in content: myspace");
  });
});
