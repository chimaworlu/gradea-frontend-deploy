"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { problemMessage } from "../../lib/auth/forms";
import { getPending, pendingView, type PendingFlow, type PendingView } from "../../lib/auth/google";
import { getContent } from "../../lib/content";
import { FormIntro } from "./FormPieces";
import styles from "./form.module.css";

export type PendingState = { kind: "checking" } | PendingView;

/** Asks the API once, on load, which Google sign-in is waiting (GET /api/auth/google/pending). */
export function useGooglePending(expected: PendingFlow): PendingState {
  const [state, setState] = useState<PendingState>({ kind: "checking" });

  useEffect(() => {
    let current = true;
    void getPending().then((result) => {
      if (current) setState(pendingView(result, expected));
    });
    // A page left before the answer arrives ignores it.
    return () => {
      current = false;
    };
  }, [expected]);

  return state;
}

/** "Checking your Google sign-in..." while the API answers. */
export function PendingChecking({ text }: { text: string }) {
  return (
    <p className={styles.status} role="status">
      {text}
    </p>
  );
}

/** The timed-out state: the pending sign-in is missing, old, or for the other page. */
export function PendingExpired({
  heading,
  body,
  action,
  href,
}: {
  heading: string;
  body: string;
  action: string;
  href: string;
}) {
  return (
    <>
      <FormIntro heading={heading} subline={body} />
      <Link className={styles.primary} href={href}>
        {action}
      </Link>
    </>
  );
}

/** Any other answer: its wording, with a way back. */
export function PendingFailed({
  state,
  action,
  href,
}: {
  state: Extract<PendingState, { kind: "error" } | { kind: "network" }>;
  action: string;
  href: string;
}) {
  const message =
    state.kind === "network" ? getContent("shared/errors").network : problemMessage(state.code);
  return (
    <>
      <p className={styles.formError} role="alert">
        {message}
      </p>
      <Link className={styles.primary} href={href}>
        {action}
      </Link>
    </>
  );
}
