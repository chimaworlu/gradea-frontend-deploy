"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { getContent } from "../../lib/content";
import { MenuPanel, type MenuEntry } from "../app/MenuPanel";
import { FieldIcon } from "../icons/FieldIcon";
import uploadStyles from "../scan/upload.module.css";
import styles from "./more.module.css";

/**
 * The "..." button in the results top bar and its menu (B8 "More menu", PRD FR-28), on the menu
 * shared with the avatar menu. Dashboard and Download CV are shown switched off until their
 * pages exist (Build Plan Phases 5 and 7); Feedback opens D4.
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

  const entries: MenuEntry[] = [
    { key: "dashboard", label: text.dashboard, icon: "layoutDashboard", enabled: false },
    { key: "download", label: text.download, icon: "download", enabled: false },
    {
      key: "feedback",
      label: text.feedback,
      icon: "messageSquare",
      enabled: true,
      onSelect: () => {
        setOpen(false);
        onFeedback();
      },
    },
  ];

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
      <MenuPanel
        id={menuId}
        label={text.menuLabel}
        open={open}
        entries={entries}
        className={styles.menu}
        onClose={(focusButton) => {
          setOpen(false);
          if (focusButton) button.current?.focus();
        }}
      />
    </div>
  );
}
