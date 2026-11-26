"use client";

import { useEffect, useState } from "react";
import { fillPlaceholders, getContent, keywordGroupLabel } from "../../lib/content";
import {
  LINES_SHOWN_FIRST,
  keywordRows,
  keywordTotals,
  tailorView,
  type KeywordRow,
  type ScoredJobResult,
  type TailorCard,
  type TailorView,
} from "../../lib/scan/result";
import { FieldIcon } from "../icons/FieldIcon";
import scanStyles from "../scan/scan.module.css";
import { CvPage, cvLineId } from "./CvPage";
import { ScoreRing } from "./ScoreRing";
import styles from "./results.module.css";

/**
 * C1 Job-specific results, Free (Build Plan Phase 3, PRD FR-36). The server sends a Free user no
 * missing keyword, only counts. A PRO answer does carry them; they are not rendered until C2 is
 * built. AutoFix, Magic Write, Re-score and "Unlock with PRO" come later.
 */
export function JobResults({ result }: { result: ScoredJobResult }) {
  const text = getContent("app/job-results");
  const rows = keywordRows(result.keyword_groups);
  const totals = keywordTotals(rows);
  const score = result.relevancy_score;
  const missing = text.missingKeywords;
  const tailor = tailorView(result);
  // The line picked from a tailor card, outlined and scrolled to in the CV panel, as on B3.
  const [activeLine, setActiveLine] = useState<string | undefined>(undefined);

  // Scrolls the CV panel to the picked line (instant with reduced motion).
  useEffect(() => {
    if (activeLine === undefined) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(cvLineId(activeLine))
      ?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [activeLine]);

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

          {tailor !== undefined ? (
            <TailorSection view={tailor} activeLine={activeLine} onLineSelect={setActiveLine} />
          ) : null}

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
          {/* Plain: highlights would need the locked breakdown (C1 dev notes). Only the line
              picked from a tailor card gets the General highlight. */}
          <CvPage cv={result.cv} highlight="picked" activeLine={activeLine} />
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

/**
 * "Lines to tailor for this job" (PRD FR-36). Free sees the lines of one group and the counts of
 * the locked ones; PRO sees every group, each under its name. "AutoFix this line" comes with
 * AutoFix (Build Plan Phase 4). The line text is shown only, never logged or stored.
 */
function TailorSection({
  view,
  activeLine,
  onLineSelect,
}: {
  view: TailorView;
  activeLine: string | undefined;
  onLineSelect: (lineId: string) => void;
}) {
  const text = getContent("app/job-results").tailor;
  const lockedTotal = view.locked.reduce((sum, item) => sum + item.count, 0);
  // Group names only when more than one group shows; the Free design is one plain list.
  const named = view.open.length > 1;
  return (
    <>
      <h2 className={styles.sectionTitle}>{text.heading}</h2>
      {view.open.map((item) => (
        <TailorGroup
          key={item.group}
          name={named ? keywordGroupLabel(item.group) : undefined}
          cards={item.cards}
          activeLine={activeLine}
          onLineSelect={onLineSelect}
        />
      ))}
      <span id="tailor-show-on-cv" className={scanStyles.visuallyHidden}>
        {text.showOnCv}
      </span>
      {lockedTotal > 0 ? (
        <>
          <p className={styles.detailBody}>
            {fillPlaceholders(lockedTotal === 1 ? text.locked.body.one : text.locked.body.other, {
              count: lockedTotal,
            })}
          </p>
          {view.locked.map((item) => (
            <p key={item.group} className={`${styles.missingRow} ${styles.tailorLocked}`}>
              <FieldIcon name="lock" />
              {fillPlaceholders(
                item.count === 1 ? text.locked.group.one : text.locked.group.other,
                {
                  count: item.count,
                  group: keywordGroupLabel(item.group),
                },
              )}
              <ProTag label={text.locked.proLabel} />
            </p>
          ))}
        </>
      ) : null}
    </>
  );
}

function TailorGroup({
  name,
  cards,
  activeLine,
  onLineSelect,
}: {
  name: string | undefined;
  cards: readonly TailorCard[];
  activeLine: string | undefined;
  onLineSelect: (lineId: string) => void;
}) {
  const text = getContent("app/job-results").tailor;
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? cards : cards.slice(0, LINES_SHOWN_FIRST);
  const hidden = cards.length - shown.length;
  return (
    <>
      {name !== undefined ? <h3 className={styles.tailorGroupName}>{name}</h3> : null}
      <ul className={styles.lines}>
        {shown.map((card) => (
          <li key={card.lineId}>
            {/* The whole card picks the line: the CV panel scrolls to it and outlines it. */}
            <button
              type="button"
              className={styles.lineCard}
              aria-pressed={activeLine === card.lineId}
              aria-describedby="tailor-show-on-cv"
              onClick={() => onLineSelect(card.lineId)}
            >
              <span className={styles.lineSection}>{card.meta}</span>
              <span className={styles.lineText}>{card.text}</span>
              <span className={styles.lineReason}>{card.reason}</span>
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button type="button" className={styles.showMore} onClick={() => setShowAll(true)}>
          {fillPlaceholders(text.showMore, { count: hidden })}
        </button>
      ) : null}
    </>
  );
}

function ProTag({ label }: { label?: string }) {
  const text = getContent("app/job-results").missingKeywords;
  return (
    <span className={styles.proTag}>
      <FieldIcon name="lock" />
      <span aria-hidden="true">{text.pro}</span>
      <span className={scanStyles.visuallyHidden}>{label ?? text.proLabel}</span>
    </span>
  );
}
