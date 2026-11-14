import type { Metadata } from "next";
import Image from "next/image";
import { SocialLinks, toSocialItems } from "../components/SocialLinks";
import { WaitlistForm } from "../components/WaitlistForm";
import { fillPlaceholders, getContent } from "../lib/content";
import styles from "./page.module.css";

// G12 Coming-soon landing page (FR-55). It stays at / until the full marketing site launches.
const content = getContent("marketing/coming-soon");
const socials = toSocialItems(content.socials.items);

// Indexable on purpose (Marketing dev notes, "Coming soon page: keep indexable").
export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
};

export default function ComingSoonPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {/* Logo / Lockup, used exactly as exported (never redrawn). 107 x 32 is the file's own size. */}
        <Image
          src="/brand/gradea-logo-light.svg"
          alt={content.header.logoAlt}
          width={107}
          height={32}
          priority
        />
      </header>

      <main className={styles.main}>
        <p className={styles.tag}>{content.hero.tag}</p>
        <h1 className={styles.headline}>{content.hero.headline}</h1>
        <p className={styles.subline}>{content.hero.subline}</p>
        <div className={styles.formSlot}>
          <WaitlistForm text={content.waitlistForm} />
          <p className={styles.helper}>{content.waitlistForm.helper}</p>
        </div>
      </main>

      <footer className={styles.footer}>
        <SocialLinks
          listLabel={content.socials.listLabel}
          linkLabel={content.socials.linkLabel}
          items={socials}
        />
        <p className={styles.copyright}>
          {fillPlaceholders(content.footer.copyright, { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}
