/**
 * Which social icons the coming-soon page (G12) shows.
 *
 * Tokens rule ("social icons": "Show an icon only when its link is filled") and the Marketing
 * dev notes: an icon shows only if it is marked visible AND its url is filled, in list order.
 * Links are never invented; a profile with no url simply does not show.
 */

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

/** The icons to show, in list order: only visible ones whose url is filled. */
export function selectShownSocials(items: readonly SocialItem[]): SocialItem[] {
  return items.filter((item) => item.visible && item.url !== "");
}
