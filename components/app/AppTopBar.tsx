"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LOGIN_PATH, problemMessage } from "../../lib/auth/forms";
import { avatarInitial, menuStep, signOut, type MenuEvent } from "../../lib/auth/session";
import { getContent } from "../../lib/content";
import type { Viewer } from "../../lib/scan/upload";
import styles from "./AppTopBar.module.css";
import { MenuPanel, menuErrorClass, type MenuEntry } from "./MenuPanel";

/**
 * S2 App top bar, shared by the upload, processing and results screens: the logo on the left;
 * on the right "Log in" for a guest, or the avatar and its account menu once signed in. Nothing
 * shows on the right while the session is still being checked.
 */
export function AppTopBar({
  viewer,
  afterLogo,
  beforeAccount,
}: {
  viewer: Viewer | undefined;
  /** Results only: the General / Job-specific switch (B3 and C1 "modeSwitch"). */
  afterLogo?: ReactNode;
  /** Results only: the Re-score button. */
  beforeAccount?: ReactNode;
}) {
  const text = getContent("shared/account-menu");
  return (
    <header
      className={`${styles.topBar} ${afterLogo === undefined || afterLogo === null ? "" : styles.withSwitch}`}
    >
      <div className={styles.side}>
        {/* Logo / Lockup, used exactly as exported (never redrawn). */}
        <Image
          src="/brand/gradea-logo-light.svg"
          alt={text.topBar.logoAlt}
          width={107}
          height={32}
          priority
        />
        {afterLogo}
      </div>
      <div className={styles.side}>
        {beforeAccount}
        {viewer?.kind === "guest" ? (
          <Link className={styles.logIn} href={LOGIN_PATH}>
            {text.topBar.logIn}
          </Link>
        ) : null}
        {viewer?.kind === "signedIn" ? <AccountMenu email={viewer.user.email} /> : null}
      </div>
    </header>
  );
}

/**
 * The avatar and its menu (B3 "Avatar menu"): the email, then Dashboard, History, Profile and
 * Billing, then Sign out. The four pages come later (Build Plan Phases 5 and 6), so they are
 * shown switched off and do nothing; Sign out works. The email is shown to its owner only,
 * never logged.
 */
export function AccountMenu({
  email,
  initiallyOpen = false,
}: {
  email: string;
  initiallyOpen?: boolean;
}) {
  const text = getContent("shared/account-menu");
  const errors = getContent("shared/errors");
  const [open, setOpen] = useState(initiallyOpen);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const root = useRef<HTMLDivElement>(null);
  const avatar = useRef<HTMLButtonElement>(null);
  const menuId = "account-menu";

  function step(event: MenuEvent) {
    const next = menuStep({ open }, event);
    setOpen(next.open);
    if (next.focusAvatar) avatar.current?.focus();
  }

  // A press anywhere else closes it.
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  // The four pages come later: shown switched off, in the design's order and icons.
  const entries: MenuEntry[] = [
    { key: "dashboard", label: text.menu.dashboard, icon: "layoutDashboard", enabled: false },
    { key: "history", label: text.menu.history, icon: "history", enabled: false },
    { key: "profile", label: text.menu.profile, icon: "user", enabled: false },
    { key: "billing", label: text.menu.billing, icon: "creditCard", enabled: false },
    {
      key: "signOut",
      label: signingOut ? text.menu.signOut.loading : text.menu.signOut.default,
      icon: "logOut",
      enabled: true,
      busy: signingOut,
      dividerBefore: true,
      onSelect: () => void onSignOut(),
    },
  ];

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError(undefined);
    const result = await signOut((path) => window.location.assign(path));
    if (result.kind === "ok") return;
    // Still signed in: say so, and stay.
    setSigningOut(false);
    setError(result.kind === "network" ? errors.network : problemMessage(result.code));
  }

  return (
    <div className={styles.account} ref={root}>
      <button
        ref={avatar}
        type="button"
        className={styles.avatar}
        aria-label={text.avatar.label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => step("toggle")}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span aria-hidden="true">{avatarInitial(email)}</span>
      </button>
      <MenuPanel
        id={menuId}
        label={text.menu.label}
        open={open}
        entries={entries}
        header={email}
        className={styles.menu}
        onClose={(focusButton) => step(focusButton ? "escape" : "tabAway")}
        footer={
          <p className={menuErrorClass} role="alert">
            {error ?? ""}
          </p>
        }
      />
    </div>
  );
}
