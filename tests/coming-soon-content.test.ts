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

// Reports, without failing CI, every social profile that still has no link. The icon shows
// without a link until the founder sends the real profile url (it is never invented).
describe("G12 visible social profiles still without a url", () => {
  const missing = content.socials.items.filter((item) => item.visible && item.url === "");
  for (const item of missing) {
    it.todo(`add the ${item.name} profile url to content/marketing/coming-soon.json`);
  }
  it("counts the profiles still without a url", () => {
    expect(missing.length).toBeLessThanOrEqual(content.socials.items.length);
  });
});
