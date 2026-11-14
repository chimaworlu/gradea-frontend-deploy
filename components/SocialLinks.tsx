import { fillPlaceholders } from "../lib/content";
import type { SocialItem } from "../lib/socials";
import { SocialIcon } from "./icons/SocialIcon";
import styles from "./SocialLinks.module.css";

type Props = {
  listLabel: string;
  linkLabel: string;
  /** Already filtered with selectShownSocials (lib/socials.ts). */
  items: readonly SocialItem[];
};

/**
 * The social icons shown on G12. An icon is a link only when its profile url is filled in the
 * content file. Until then it shows as a plain icon, never a dead link (founder decision:
 * profiles are not created yet, and links are never invented).
 */
export function SocialLinks({ listLabel, linkLabel, items }: Props) {
  if (items.length === 0) {
    return null;
  }
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
