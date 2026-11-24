import type { CSSProperties } from "react";
import { scoreTone } from "../../lib/scan/result";
import styles from "./results.module.css";

/** The score ring of B3 and C1: green from 75, amber below; never red. */
export function ScoreRing({
  score,
  shown,
  label,
  small = false,
}: {
  score: number;
  /** The number as it is written, for example "72%". */
  shown: string;
  label: string;
  /** A longer number, which needs the smaller size to fit. */
  small?: boolean;
}) {
  // The arc's length is the score; the custom property feeds the CSS conic gradient.
  const ringStyle: CSSProperties & Record<"--score", number> = { "--score": score };
  return (
    <div
      className={`${styles.ring} ${scoreTone(score) === "strong" ? styles.ringStrong : ""}`}
      style={ringStyle}
      data-tone={scoreTone(score)}
      role="img"
      aria-label={label}
    >
      <span
        className={`${styles.ringNumber} ${small ? styles.ringNumberSmall : ""}`}
        aria-hidden="true"
      >
        {shown}
      </span>
    </div>
  );
}
