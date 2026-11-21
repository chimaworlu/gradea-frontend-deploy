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

  // The menu is never cut off: it opens upward when there is not room below, and if neither
  // side has room it takes the larger one and scrolls inside.
  useLayoutEffect(() => {
    const list = menu.current;
    const anchor = root.current;
    if (!open || list === null || anchor === null) return;
    delete list.dataset.up;
    list.style.maxHeight = "";
    const gap = list.offsetTop - anchor.offsetHeight;
    const needed = list.offsetHeight + gap;
    const box = anchor.getBoundingClientRect();
    const below = window.innerHeight - box.bottom;
    const above = box.top;
    if (needed <= below) return;
    const up = needed <= above || above > below;
    if (up) list.dataset.up = "true";
    const room = (up ? above : below) - gap * 2;
    if (needed > room + gap) list.style.maxHeight = `${Math.max(room, 0)}px`;
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
