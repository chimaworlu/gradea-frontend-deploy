"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { getContent } from "../../lib/content";
import { FieldIcon, type FieldIconName } from "../icons/FieldIcon";
import uploadStyles from "../scan/upload.module.css";
import styles from "./more.module.css";

type Item = { key: "dashboard" | "download" | "feedback"; icon: FieldIconName; enabled: boolean };

/**
 * The menu's items in the B8 "More menu" order. Dashboard and Download CV are shown switched off
 * until their pages exist (Build Plan Phases 5 and 7): they can be reached with the arrow keys but
 * do nothing.
 */
export const MORE_MENU_ITEMS: readonly Item[] = [
  { key: "dashboard", icon: "layoutDashboard", enabled: false },
  { key: "download", icon: "download", enabled: false },
  { key: "feedback", icon: "messageSquare", enabled: true },
];

/**
 * The "..." button in the results top bar and its menu (B8 "More menu", PRD FR-28). Arrow keys,
 * Home and End move between the items; Escape or a press outside closes it and puts focus back
 * on the button; Tab closes it and carries on.
 */
export function MoreMenu({
  onFeedback,
  button,
  initiallyOpen = false,
}: {
  onFeedback: () => void;
  /** The "..." button, so the page can put focus back on it after the Feedback popup. */
  button: RefObject<HTMLButtonElement | null>;
  initiallyOpen?: boolean;
}) {
  const text = getContent("app/rescore").topBar.more;
  const [open, setOpen] = useState(initiallyOpen);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = "more-menu";

  // A press anywhere else closes it.
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  // Opening moves focus to the first item, so the keyboard carries on inside the menu.
  useEffect(() => {
    if (open) items.current[0]?.focus();
  }, [open]);

  function focusItem(index: number) {
    const count = MORE_MENU_ITEMS.length;
    items.current[((index % count) + count) % count]?.focus();
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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
        focusItem(MORE_MENU_ITEMS.length - 1);
        return;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        button.current?.focus();
        return;
      case "Tab":
        setOpen(false);
        return;
    }
  }

  function choose(item: Item) {
    if (!item.enabled) return;
    setOpen(false);
    if (item.key === "feedback") onFeedback();
  }

  return (
    <div className={styles.more} ref={root}>
      <button
        ref={button}
        type="button"
        className={`${uploadStyles.switchOption} ${styles.moreButton}`}
        aria-label={text.button}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <FieldIcon name="moreHorizontal" />
      </button>
      <div className={styles.menu} hidden={!open} onKeyDown={onMenuKeyDown}>
        <ul id={menuId} role="menu" aria-label={text.menuLabel}>
          {MORE_MENU_ITEMS.map((item, index) => (
            <li key={item.key} role="none">
              <button
                ref={(element) => {
                  items.current[index] = element;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={styles.item}
                aria-disabled={item.enabled ? undefined : true}
                onClick={() => choose(item)}
              >
                <FieldIcon name={item.icon} />
                {text[item.key]}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
