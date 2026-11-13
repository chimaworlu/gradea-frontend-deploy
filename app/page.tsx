import type { Metadata } from "next";
import { getContent } from "../lib/content";
import styles from "./page.module.css";

const content = getContent("marketing/placeholder");

export const metadata: Metadata = {
  title: content.meta.pageTitle,
};

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>{content.hero.heading}</h1>
        <p className={styles.body}>{content.hero.body}</p>
      </div>
    </main>
  );
}
