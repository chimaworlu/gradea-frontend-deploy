import { describe, expect, it } from "vitest";
import { fillPlaceholders, getContent } from "../lib/content";

const content = getContent("marketing/coming-soon");

describe("G12 coming-soon content", () => {
  it("has the agreed page title and a description", () => {
    expect(content.meta.title).toBe("Gradea, coming soon");
    expect(content.meta.description.length).toBeGreaterThan(0);
  });

  it("has the follow line and no waitlist text", () => {
    expect(content.hero.follow).toBe("Follow us for updates.");
    expect(Object.keys(content)).not.toContain("waitlistForm");
  });

  it("fills the year into the footer", () => {
    expect(fillPlaceholders(content.footer.copyright, { year: 2026 })).toBe("© 2026 Gradea");
  });

  it("lists the six social profiles in the agreed order", () => {
    expect(content.socials.items.map((item) => item.network)).toEqual([
      "linkedin",
      "tiktok",
      "facebook",
      "youtube",
      "x",
      "instagram",
    ]);
  });

  it("marks LinkedIn, TikTok, YouTube and X visible, Facebook and Instagram hidden", () => {
    const visible = Object.fromEntries(
      content.socials.items.map((item) => [item.network, item.visible]),
    );
    expect(visible).toEqual({
      linkedin: true,
      tiktok: true,
      facebook: false,
      youtube: true,
      x: true,
      instagram: false,
    });
  });

  it("uses only https links for socials that have a url", () => {
    for (const item of content.socials.items) {
      if (item.url !== "") {
        expect(new URL(item.url).protocol, item.name).toBe("https:");
      }
    }
  });
});

describe("G12 social profile links", () => {
  it("has the four real profile urls and keeps Facebook and Instagram empty", () => {
    const urls = Object.fromEntries(content.socials.items.map((item) => [item.network, item.url]));
    expect(urls).toEqual({
      linkedin: "https://www.linkedin.com/company/usegradea",
      tiktok: "https://www.tiktok.com/@usegradea",
      facebook: "",
      youtube: "https://www.youtube.com/@usegradea",
      x: "https://x.com/usegradea",
      instagram: "",
    });
  });
});
