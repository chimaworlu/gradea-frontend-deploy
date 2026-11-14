import type { SocialNetwork } from "../../lib/socials";
import styles from "./icon.module.css";

/**
 * Outline social icons at 1.5px stroke (design tokens "icons"). LinkedIn, Instagram and
 * YouTube use the Lucide shapes. Lucide has no X logo, so X uses the Tabler outline shape.
 * Facebook uses the founder-supplied outline path. TikTok is the Figma export path (a 20x20
 * canvas with a 1.25 stroke), scaled by 1.2 to this 24x24 box, which draws it at 1.5.
 * Instagram is kept for later; content decides whether it shows.
 * Decorative only: the link around an icon carries the accessible name.
 */
export function SocialIcon({ network }: { network: SocialNetwork }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {network === "linkedin" && (
        <>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect width="4" height="12" x="2" y="9" />
          <circle cx="4" cy="4" r="2" />
        </>
      )}
      {network === "tiktok" && (
        <g transform="scale(1.2)" strokeWidth="1.25">
          <path d="M7.49996 9.99967C6.84069 9.99967 6.19622 10.1952 5.64806 10.5614C5.0999 10.9277 4.67265 11.4483 4.42036 12.0574C4.16807 12.6665 4.10206 13.3367 4.23068 13.9833C4.35929 14.6299 4.67676 15.2239 5.14294 15.69C5.60911 16.1562 6.20306 16.4737 6.84966 16.6023C7.49626 16.7309 8.16649 16.6649 8.77557 16.4126C9.38466 16.1603 9.90525 15.7331 10.2715 15.1849C10.6378 14.6367 10.8333 13.9923 10.8333 13.333V3.33301C10.8333 4.43808 11.2723 5.49788 12.0537 6.27929C12.8351 7.06069 13.8949 7.49967 15 7.49967" />
        </g>
      )}
      {network === "facebook" && (
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      )}
      {network === "x" && (
        <>
          <path d="M4 4l11.733 16h4.267l-11.733-16z" />
          <path d="M4 20l6.768-6.768m2.46-2.46l6.772-6.772" />
        </>
      )}
      {network === "instagram" && (
        <>
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </>
      )}
      {network === "youtube" && (
        <>
          <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
          <path d="m10 15 5-3-5-3z" />
        </>
      )}
    </svg>
  );
}

/** Lucide "check", used for the joined state. Decorative: the text beside it says what happened. */
export function CheckIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
