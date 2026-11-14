import { describe, expect, it } from "vitest";
import { getContent } from "../lib/content";
import {
  SHOW_SOCIAL_ICONS_WITHOUT_URL,
  selectShownSocials,
  toSocialItems,
  type SocialItem,
} from "../lib/socials";

const contentItems = toSocialItems(getContent("marketing/coming-soon").socials.items);

function item(network: SocialItem["network"], visible: boolean, url = ""): SocialItem {
  return { network, name: network, url, visible };
}

describe("social icons on the coming-soon page", () => {
  it("shows LinkedIn, TikTok, YouTube and X in that order before launch", () => {
    expect(SHOW_SOCIAL_ICONS_WITHOUT_URL).toBe(true);
    expect(selectShownSocials(contentItems).map((social) => social.network)).toEqual([
      "linkedin",
      "tiktok",
      "youtube",
      "x",
    ]);
  });

  it("never shows Facebook or Instagram while they are not visible, even with a url", () => {
    const items = [
      item("facebook", false, "https://example.test/fb"),
      item("instagram", false, "https://example.test/ig"),
    ];
    expect(selectShownSocials(items, true)).toEqual([]);
    expect(selectShownSocials(items, false)).toEqual([]);
  });

  it("before launch, shows a visible icon even when its url is empty", () => {
    expect(selectShownSocials([item("linkedin", true)], true)).toHaveLength(1);
  });

  it("after the launch switch, shows only visible icons whose url is filled, in order", () => {
    const items = [
      item("linkedin", true, "https://example.test/in"),
      item("tiktok", true),
      item("youtube", true, "https://example.test/yt"),
      item("x", true),
    ];
    expect(selectShownSocials(items, false).map((social) => social.network)).toEqual([
      "linkedin",
      "youtube",
    ]);
  });

  it("rejects an unknown network in the content file", () => {
    expect(() =>
      toSocialItems([{ network: "myspace", name: "Myspace", url: "", visible: true }]),
    ).toThrow("Unknown social network in content: myspace");
  });
});
