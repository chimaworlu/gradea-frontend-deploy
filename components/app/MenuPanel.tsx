"use client";

import { Fragment, useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { FieldIcon, type FieldIconName } from "../icons/FieldIcon";
import styles from "./menu.module.css";

export type MenuEntry = {
  key: string;
  label: string;
  icon: FieldIconName;
  /** Off until its page exists: shown dimmed, reachable with the arrow keys, does nothing. */
  enabled: boolean;
  onSelect?: () => void;
  /** A line above this item, starting a new group. */
  dividerBefore?: boolean;
  busy?: boolean;
};

/**
 * The menu list shared by the avatar menu and the More menu, so both look and behave the same.
 * Opening moves focus to the first item. Arrow keys, Home and End move between all items,
 * switched-off ones included; Escape closes and puts focus back on the button that opened it;
 * Tab closes and carries on. The caller owns the button and closes on a press outside.
 */
export function MenuPanel({
  id,
  label,
  open,
  entries,
  header,
  footer,
  className,
  onClose,
}: {
  id: string;
  label: string;
  open: boolean;
  entries: readonly MenuEntry[];
  /** Above the items, with a line under it (the account email). */
  header?: ReactNode;
  footer?: ReactNode;
  /** The menu's own width and place under its button. */
  className?: string;
  /** focusButton is true for Escape, which puts focus back on the button. */
  onClose: (focusButton: boolean) => void;
}) {
  const items = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (open) items.current[0]?.focus();
  }, [open]);

  function focusItem(index: number) {
    const count = entries.length;
    items.current[((index % count) + count) % count]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = items.current.findIndex((item) => item === document.activeElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(current + 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        focusItem(current - 1);
        return;
      case "Home":
        event.preventDefault();
        focusItem(0);
        return;
      case "End":
        event.preventDefault();
        focusItem(entries.length - 1);
        return;
      case "Escape":
        event.preventDefault();
        onClose(true);
        return;
      case "Tab":
        onClose(false);
        return;
    }
  }

  return (
    <div className={`${styles.panel} ${className ?? ""}`} hidden={!open} onKeyDown={onKeyDown}>
      {header !== undefined ? (
        <>
          <div className={styles.header}>{header}</div>
          <div className={styles.divider} role="presentation" />
        </>
      ) : null}
      <ul id={id} className={styles.list} role="menu" aria-label={label}>
        {entries.map((entry, index) => (
          <Fragment key={entry.key}>
            {entry.dividerBefore ? <li role="separator" className={styles.divider} /> : null}
            <li role="none">
              <button
                ref={(element) => {
                  items.current[index] = element;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={styles.item}
                aria-disabled={entry.enabled ? undefined : true}
                aria-busy={entry.busy ? true : undefined}
                onClick={() => {
                  if (entry.enabled) entry.onSelect?.();
                }}
              >
                <FieldIcon name={entry.icon} />
                <span>{entry.label}</span>
              </button>
            </li>
          </Fragment>
        ))}
      </ul>
      {footer}
    </div>
  );
}

/** The class for a failed action's line under the items (the avatar menu's sign out). */
export const menuErrorClass = styles.error;
