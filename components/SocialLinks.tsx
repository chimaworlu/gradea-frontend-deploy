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
 * The social icons shown on G12. Every icon is a real link that opens the profile in a new tab.
 * An item with an empty url is never rendered, so there is no dead link or plain icon.
 */
export function SocialLinks({ listLabel, linkLabel, items }: Props) {
  const linked = items.filter((item) => item.url !== "");
  if (linked.length === 0) {
    return null;
  }
  return (
    <ul className={styles.list} aria-label={listLabel}>
      {linked.map((item) => (
        <li key={item.network}>
          <a
            className={`${styles.item} ${styles.link}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={fillPlaceholders(linkLabel, { network: item.name })}
          >
            <SocialIcon network={item.network} />
          </a>
        </li>
      ))}
    </ul>
  );
}
