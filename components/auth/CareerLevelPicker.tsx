"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CAREER_LEVELS, isCareerLevel } from "../../lib/auth/forms";
import { listboxKey } from "../../lib/auth/listbox";
import { careerLevelLabel, getContent } from "../../lib/content";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./form.module.css";

export type CareerLevelPickerProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

/**
 * The career level picker (FR-23), as the A3 "Career level open" frame: a field with a chevron
 * that opens a list 4px under it at the same width, 44px rows, a navy tint on the highlighted
 * row and a darker tint with a navy check on the chosen one. A select-only combobox, so arrow
 * keys, Enter, Escape, Home, End and letters work, and screen readers hear the highlighted row.
 * Used by A4 /signup, and later A3 and /signup/google.
 */
export function CareerLevelPicker({
  id,
  value,
  onValueChange,
  error,
  disabled,
}: CareerLevelPickerProps) {
  const text = getContent("shared/forms").careerLevel;
  const labels = CAREER_LEVELS.map((level) => careerLevelLabel(level));
  const selected = isCareerLevel(value) ? CAREER_LEVELS.indexOf(value) : -1;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);

  const listId = `${id}-list`;
  const labelId = `${id}-label`;
  const optionId = (index: number) => `${id}-option-${CAREER_LEVELS[index] ?? index}`;
  const describedBy = error ? `${id}-error` : undefined;

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function choose(index: number) {
    const level = CAREER_LEVELS[index];
    if (level !== undefined) onValueChange(level);
    close();
  }

  // A click anywhere else closes the list without changing the value.
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

  // Keep the highlighted row in view when the list is taller than the screen.
  useEffect(() => {
    if (open && active >= 0)
      document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
  });

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
    <div className={styles.field} ref={root}>
      <label id={labelId} className={styles.label} htmlFor={id}>
        {text.label}
      </label>
      <div className={styles.control}>
        <button
          type="button"
          id={id}
          role="combobox"
          className={`${styles.input} ${styles.picker} ${styles.withIcon} ${selected < 0 ? styles.pickerEmpty : ""} ${error ? styles.invalid : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${labelId} ${id}`}
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          // Mouse and touch: a press opens or closes. Keys are handled in onKeyDown instead.
          onClick={(event) => {
            if (event.detail === 0) return;
            if (open) close();
            else {
              setOpen(true);
              setActive(selected >= 0 ? selected : 0);
            }
          }}
          onKeyDown={onKeyDown}
          onBlur={(event) => {
            if (!(
              event.relatedTarget instanceof Node && root.current?.contains(event.relatedTarget)
            ))
              close();
          }}
        >
          {selected >= 0 ? labels[selected] : text.placeholder}
        </button>
        <span className={styles.chevron}>
          <FieldIcon name={open ? "chevronUp" : "chevronDown"} />
        </span>
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className={styles.listbox}
          hidden={!open}
          // Keep focus on the field while a row is pressed, so the list does not close first.
          onPointerDown={(event) => event.preventDefault()}
        >
          {CAREER_LEVELS.map((level, index) => (
            <li
              key={level}
              id={optionId(index)}
              role="option"
              aria-selected={index === selected}
              className={`${styles.option} ${index === active ? styles.optionActive : ""} ${index === selected ? styles.optionSelected : ""}`}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>{labels[index]}</span>
              {index === selected ? (
                <span className={styles.optionCheck}>
                  <FieldIcon name="check" />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <p id={`${id}-error`} className={styles.error} aria-live="polite">
        {error ?? ""}
      </p>
    </div>
  );
}
