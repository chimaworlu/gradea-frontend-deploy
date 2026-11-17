import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./AuthShell.module.css";

/** The A4, A5 and A6 page: a top bar with the wordmark, and the 480 wide form column. */
export function AuthShell({ logoAlt, children }: { logoAlt: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        {/* Logo / Lockup, used exactly as exported (never redrawn). 107 x 32 is the file's own size. */}
        <Image src="/brand/gradea-logo-light.svg" alt={logoAlt} width={107} height={32} priority />
      </header>
      <main className={styles.main}>
        <div className={styles.column}>{children}</div>
      </main>
    </div>
  );
}
