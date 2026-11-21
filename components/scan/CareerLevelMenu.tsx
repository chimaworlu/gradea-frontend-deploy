"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { CareerLevel } from "../../lib/api/shared";
import { CAREER_LEVELS } from "../../lib/auth/forms";
import { listboxKey } from "../../lib/auth/listbox";
import { careerLevelLabel, getContent, placeholderParts } from "../../lib/content";
import formStyles from "../auth/form.module.css";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./upload.module.css";

/**
 * "Scoring as Mid-level  Change" (A1 Free "Career level menu"). The choice applies to this scan
 * only and never changes the stored default (FR-24). Same keyboard rules as the A3 picker.
 */
export function CareerLevelMenu({
  value,
  onValueChange,
  disabled,
}: {
  value: CareerLevel;
  onValueChange: (level: CareerLevel) => void;
  disabled?: boolean;
}) {
  const text = getContent("app/upload").careerLevel;
  const labels = CAREER_LEVELS.map((level) => careerLevelLabel(level));
  const selected = CAREER_LEVELS.indexOf(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const listId = "scan-career-level-list";
  const optionId = (index: number) => `scan-career-level-${CAREER_LEVELS[index] ?? index}`;

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function choose(index: number) {
    const level = CAREER_LEVELS[index];
    if (level !== undefined) onValueChange(level);
    close();
  }

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  // Always opens downward, under "Scoring as", as in the A1 Free "Career level menu" frame. If
  // it would run past the bottom of the window, the page scrolls just enough to show all of it;
  // the menu itself is never shrunk or scrolled inside. No smooth scroll with reduced motion.
  useLayoutEffect(() => {
    const list = menu.current;
    if (!open || list === null) return;
    list.scrollIntoView({ block: "nearest", behavior: menuScrollBehavior(prefersReducedMotion()) });
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = listboxKey({ open, active }, event, selected, labels);
    if (step.handled) event.preventDefault();
    if (step.choose !== undefined) {
      choose(step.choose);
      return;
    }
    setOpen(step.open);
    setActive(step.active);
  }

  return (
    <div className={styles.careerLine} ref={root}>
      <p id="scan-career-level-label">
        {placeholderParts<ReactNode>(text.scoringAs, {
          level: <span className={styles.careerLevel}>{labels[selected]}</span>,
        }).map((part, index) => (
          <Fragment key={index}>{part}</Fragment>
        ))}
      </p>
      <button
        type="button"
        className={styles.textButton}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby="scan-career-level-label"
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        disabled={disabled}
        onClick={(event) => {
          if (event.detail === 0) return;
          if (open) close();
          else {
            setOpen(true);
            setActive(selected);
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          if (!(event.relatedTarget instanceof Node && root.current?.contains(event.relatedTarget)))
            close();
        }}
      >
        {text.change}
      </button>
      <div className={styles.menu} hidden={!open} ref={menu}>
        <ul
          id={listId}
          role="listbox"
          aria-labelledby="scan-career-level-label"
          onPointerDown={(event) => event.preventDefault()}
        >
          {CAREER_LEVELS.map((level, index) => (
            <li
              key={level}
              id={optionId(index)}
              role="option"
              aria-selected={index === selected}
              className={`${formStyles.option} ${index === active ? formStyles.optionActive : ""} ${index === selected ? formStyles.optionSelected : ""}`}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>{labels[index]}</span>
              {index === selected ? (
                <span className={formStyles.optionCheck}>
                  <FieldIcon name="check" />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {/* "Change your default in Profile" goes under this note once the Profile page exists. */}
        <p className={styles.menuNote}>{text.menuNote}</p>
      </div>
    </div>
  );
}

/** True when the person asked for less motion (design-system-rules section 7). */
function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Smooth scrolling unless reduced motion is on. */
export function menuScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth";
}
