import { fillPlaceholders } from "../lib/content";
import { SocialIcon, type SocialNetwork } from "./icons/SocialIcon";
import styles from "./SocialLinks.module.css";

export type SocialItem = { network: SocialNetwork; name: string; url: string };

const NETWORKS: readonly SocialNetwork[] = ["linkedin", "x", "instagram", "youtube"];

function isSocialNetwork(value: string): value is SocialNetwork {
  return NETWORKS.some((network) => network === value);
}

/** Checks the socials list from the content file. An unknown network fails the build. */
export function toSocialItems(
  items: readonly { network: string; name: string; url: string }[],
): SocialItem[] {
  return items.map(({ network, name, url }) => {
    if (!isSocialNetwork(network)) {
      throw new Error(`Unknown social network in content: ${network}`);
    }
    return { network, name, url };
  });
}

type Props = {
  listLabel: string;
  linkLabel: string;
  items: readonly SocialItem[];
};

/**
 * The social icons shown on G12. An icon is a link only when its profile url is filled in the
 * content file. Until then it shows as in the design but is not a link (founder decision:
 * profiles are not created yet, and links are never invented).
 */
export function SocialLinks({ listLabel, linkLabel, items }: Props) {
  return (
    <ul className={styles.list} aria-label={listLabel}>
      {items.map((item) => (
        <li key={item.network}>
          {item.url === "" ? (
            <span className={styles.item} aria-hidden="true">
              <SocialIcon network={item.network} />
            </span>
          ) : (
            <a
              className={`${styles.item} ${styles.link}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fillPlaceholders(linkLabel, { network: item.name })}
            >
              <SocialIcon network={item.network} />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
