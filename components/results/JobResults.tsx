import { fillPlaceholders, getContent, keywordGroupLabel } from "../../lib/content";
import {
  keywordRows,
  keywordTotals,
  type KeywordRow,
  type ScoredJobResult,
} from "../../lib/scan/result";
import { FieldIcon } from "../icons/FieldIcon";
import scanStyles from "../scan/scan.module.css";
import { CvPage } from "./CvPage";
import { ScoreRing } from "./ScoreRing";
import styles from "./results.module.css";

/**
 * C1 Job-specific results, Free (Build Plan Phase 3, PRD FR-36). The server sends a Free user no
 * missing keyword, only counts. A PRO answer does carry them; they are not rendered until C2 is
 * built. "Lines to tailor", AutoFix, Magic Write, Re-score and "Unlock with PRO" come later.
 */
export function JobResults({ result }: { result: ScoredJobResult }) {
  const text = getContent("app/job-results");
  const rows = keywordRows(result.keyword_groups);
  const totals = keywordTotals(rows);
  const score = result.relevancy_score;
  const missing = text.missingKeywords;

  return (
    <div className={styles.layout}>
      <div className={styles.mainColumns}>
        <aside className={styles.rail}>
          <div className={styles.overall}>
            <ScoreRing
              score={score}
              shown={fillPlaceholders(text.rail.percent, { score })}
              label={fillPlaceholders(text.rail.scoreLabel, { score })}
              small
            />
            <p className={styles.overallLabel}>{text.rail.relevancyScore}</p>
          </div>
        </aside>
        <section className={styles.detail} aria-labelledby="keyword-match-heading">
          <h1 id="keyword-match-heading" className={styles.detailHeading}>
            {text.keywordMatch.heading}
          </h1>
          <p className={styles.matchHeadline}>
            {fillPlaceholders(
              totals.total === 1
                ? text.keywordMatch.headline.one
                : text.keywordMatch.headline.other,
              { matched: totals.matched, total: totals.total },
            )}
          </p>
          <ul className={styles.keywordGroups}>
            {rows.map((row) => (
              <KeywordGroupRow key={row.group} row={row} locked={result.missing_locked} />
            ))}
          </ul>

          {result.missing_locked && totals.missing > 0 ? (
            <>
              <h2 className={styles.sectionTitle}>
                {missing.heading}
                <ProTag />
              </h2>
              <p className={styles.detailBody}>
                {fillPlaceholders(totals.missing === 1 ? missing.body.one : missing.body.other, {
                  count: totals.missing,
                })}
              </p>
              {/* Grey shapes only: there is no name behind them (the server sent none). */}
              <div className={`${styles.lockedCard} ${styles.missingCard}`} aria-hidden="true">
                <span className={styles.lockedBar} />
                <span className={styles.lockedBar} />
                <span className={styles.lockedBar} />
                <span className={styles.lockedBar} />
                <span className={styles.lockedIcon}>
                  <FieldIcon name="lock" />
                </span>
              </div>
            </>
          ) : null}
        </section>
      </div>
      {result.cv.length > 0 ? (
        <section className={styles.cvPanel} aria-label={getContent("app/results").cvPanel.label}>
          {/* Plain: highlights would need the locked breakdown (C1 dev notes). */}
          <CvPage cv={result.cv} marking={false} activeLine={undefined} />
        </section>
      ) : null}
    </div>
  );
}

function KeywordGroupRow({ row, locked }: { row: KeywordRow; locked: boolean }) {
  const text = getContent("app/job-results").keywordMatch;
  const name = keywordGroupLabel(row.group);
  return (
    <li className={styles.keywordGroup}>
      <h2 className={styles.keywordGroupTitle}>
        <span>{name}</span>
        <span className={styles.keywordCount}>
          {fillPlaceholders(text.groupCount, { matched: row.matchedCount, total: row.total })}
        </span>
      </h2>
      {row.matched.length > 0 ? (
        <ul
          className={styles.chips}
          aria-label={fillPlaceholders(text.matchedLabel, { group: name })}
        >
          {row.matched.map((keyword) => (
            <li key={keyword} className={styles.chip}>
              {/* Green only means matched; the list's label says it in words too. */}
              <span className={styles.chipIcon}>
                <FieldIcon name="check" />
              </span>
              {keyword}
            </li>
          ))}
        </ul>
      ) : null}
      {row.missingCount > 0 ? (
        <p className={styles.missingRow}>
          {locked ? <FieldIcon name="lock" /> : null}
          {fillPlaceholders(text.missing, { count: row.missingCount })}
          {locked ? <ProTag /> : null}
        </p>
      ) : null}
    </li>
  );
}

function ProTag() {
  const text = getContent("app/job-results").missingKeywords;
  return (
    <span className={styles.proTag}>
      <FieldIcon name="lock" />
      <span aria-hidden="true">{text.pro}</span>
      <span className={scanStyles.visuallyHidden}>{text.proLabel}</span>
    </span>
  );
}
