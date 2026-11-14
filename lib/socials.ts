/**
 * Which social icons the coming-soon page (G12) shows.
 *
 * Founder decision (before launch): every entry marked "visible" shows, in list order. An icon
 * whose url is still empty shows as a plain icon, not a link (links are never invented).
 *
 * At launch, once the real profile urls are filled in content/marketing/coming-soon.json, set
 * SHOW_SOCIAL_ICONS_WITHOUT_URL to false. The tokens rule then applies ("social icons":
 * "Show an icon only when its link is filled"): an icon shows only if it is visible AND has a url.
 */
export const SHOW_SOCIAL_ICONS_WITHOUT_URL = true;

export const SOCIAL_NETWORKS = [
  "linkedin",
  "tiktok",
  "facebook",
  "youtube",
  "x",
  "instagram",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export type SocialItem = { network: SocialNetwork; name: string; url: string; visible: boolean };

type SocialContentItem = { network: string; name: string; url: string; visible: boolean };

function isSocialNetwork(value: string): value is SocialNetwork {
  return SOCIAL_NETWORKS.some((network) => network === value);
}

/** Checks the socials list from the content file. An unknown network fails the build. */
export function toSocialItems(items: readonly SocialContentItem[]): SocialItem[] {
  return items.map(({ network, name, url, visible }) => {
    if (!isSocialNetwork(network)) {
      throw new Error(`Unknown social network in content: ${network}`);
    }
    return { network, name, url, visible };
  });
}

/** The icons to show, in list order: visible ones, and (after launch) only those with a url. */
export function selectShownSocials(
  items: readonly SocialItem[],
  showWithoutUrl: boolean = SHOW_SOCIAL_ICONS_WITHOUT_URL,
): SocialItem[] {
  return items.filter((item) => item.visible && (showWithoutUrl || item.url !== ""));
}
