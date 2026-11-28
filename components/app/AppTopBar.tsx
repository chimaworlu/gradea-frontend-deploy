"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { LOGIN_PATH, problemMessage } from "../../lib/auth/forms";
import { avatarInitial, menuStep, signOut, type MenuEvent } from "../../lib/auth/session";
import { getContent } from "../../lib/content";
import type { Viewer } from "../../lib/scan/upload";
import { FieldIcon } from "../icons/FieldIcon";
import styles from "./AppTopBar.module.css";

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
 * The avatar and its menu (S2 "Avatar menu"). The design also lists Dashboard, History, Profile
 * and Billing; they are left out until those pages exist (Build Plan Phases 5 and 6), so only
 * the email and "Sign out" show. The email is shown to its owner only, never logged.
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
  const firstItem = useRef<HTMLButtonElement>(null);
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

  // Opening moves focus to the first item, so the keyboard carries on inside the menu.
  useEffect(() => {
    if (open) firstItem.current?.focus();
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      step("escape");
    } else if (event.key === "Tab" && open) {
      step("tabAway");
    } else if (event.key === "ArrowDown" && !open && event.target === avatar.current) {
      event.preventDefault();
      setOpen(true);
    }
  }

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
    <div className={styles.account} ref={root} onKeyDown={onKeyDown}>
      <button
        ref={avatar}
        type="button"
        className={styles.avatar}
        aria-label={text.avatar.label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => step("toggle")}
      >
        <span aria-hidden="true">{avatarInitial(email)}</span>
      </button>
      <div className={styles.menu} hidden={!open}>
        <p className={styles.email}>{email}</p>
        <ul id={menuId} className={styles.items} role="menu" aria-label={text.menu.label}>
          {/* Dashboard, History, Profile and Billing go here when their pages exist. */}
          <li role="none">
            <button
              ref={firstItem}
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() => void onSignOut()}
              aria-busy={signingOut ? true : undefined}
            >
              <FieldIcon name="logOut" />
              {signingOut ? text.menu.signOut.loading : text.menu.signOut.default}
            </button>
          </li>
        </ul>
        <p className={styles.error} role="alert">
          {error ?? ""}
        </p>
      </div>
    </div>
  );
}
