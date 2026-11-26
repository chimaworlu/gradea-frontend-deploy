import type { CvPanelLine, CvPanelSection } from "../../lib/api/shared";
import { getContent } from "../../lib/content";
import { cvDisplayText, hasDatedEntries, splitEntryHeading } from "../../lib/scan/result";
import { FieldIcon } from "../icons/FieldIcon";
import scanStyles from "../scan/scan.module.css";
import styles from "./results.module.css";

/** The id of a line in the CV panel, so a line card can scroll to it. */
export function cvLineId(lineId: string): string {
  return `cv-line-${lineId}`;
}

/**
 * The CV page inside the CV panel, section by section (B3 and C1). Flagged lines are highlighted
 * only when `marking` is on; C1 is plain (C1 dev notes). The line picked from a card is outlined
 * on both pages.
 */
export function CvPage({
  cv,
  marking,
  activeLine,
}: {
  cv: readonly CvPanelSection[];
  marking: boolean;
  activeLine: string | undefined;
}) {
  const text = getContent("app/results").cvPanel;
  return (
    <div className={styles.cvPage}>
      {cv.map((group, groupIndex) => (
        <div key={`${group.section}-${groupIndex}`} className={styles.cvSection}>
          {group.lines.map((line, index) => (
            <CvLine
              key={line.line_id}
              line={line}
              isName={group.section === "contact" && groupIndex === 0 && index === 0}
              isSectionHeading={
                group.section !== "contact" && index === 0 && line.kind === "heading"
              }
              flagged={marking && line.flagged}
              active={line.line_id === activeLine}
              flaggedLabel={text.flaggedLine}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CvLine({
  line,
  isName,
  isSectionHeading,
  flagged,
  active,
  flaggedLabel,
}: {
  line: CvPanelLine;
  isName: boolean;
  isSectionHeading: boolean;
  flagged: boolean;
  active: boolean;
  flaggedLabel: string;
}) {
  const kindClass = isName
    ? styles.cvName
    : isSectionHeading
      ? styles.cvSectionHeading
      : line.kind === "heading"
        ? styles.cvHeading
        : line.kind === "bullet"
          ? styles.cvBullet
          : styles.cvText;
  // A job, project or study heading: the title bold on the left, its dates on the right.
  const entry =
    !isName && !isSectionHeading && line.kind === "heading" && hasDatedEntries(line.section)
      ? splitEntryHeading(line.text)
      : undefined;
  if (entry !== undefined) {
    return (
      <p
        id={cvLineId(line.line_id)}
        className={`${styles.cvLine} ${styles.cvHeading} ${styles.cvEntry}`}
        data-flagged={flagged ? "true" : undefined}
        data-active={active ? "true" : undefined}
      >
        {flagged ? (
          <span className={styles.cvFlag}>
            <FieldIcon name="flag" />
            <span className={scanStyles.visuallyHidden}>{flaggedLabel}</span>
          </span>
        ) : null}
        <span className={styles.cvLineText}>{entry.title}</span>
        <span className={styles.cvDates}>{entry.dates}</span>
      </p>
    );
  }
  return (
    <p
      id={cvLineId(line.line_id)}
      className={`${styles.cvLine} ${kindClass}`}
      data-flagged={flagged ? "true" : undefined}
      data-active={active ? "true" : undefined}
    >
      {flagged ? (
        <span className={styles.cvFlag}>
          <FieldIcon name="flag" />
          <span className={scanStyles.visuallyHidden}>{flaggedLabel}</span>
        </span>
      ) : null}
      <span className={styles.cvLineText}>{cvDisplayText(line, isSectionHeading)}</span>
    </p>
  );
}
