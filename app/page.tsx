import type { Metadata } from "next";
import { getContent } from "../lib/content";
import styles from "./page.module.css";

const content = getContent("marketing/coming-soon");

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
};

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>{content.hero.headline}</h1>
        <p className={styles.body}>{content.hero.subline}</p>
      </div>
    </main>
  );
}
