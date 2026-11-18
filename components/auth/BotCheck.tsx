"use client";

import { useEffect, useRef } from "react";

// The invisible bot check on public forms: Cloudflare Turnstile (SRS Section 4, security.md
// section 5). The token goes into bot_token and the server verifies it. Loaded from Cloudflare's
// script, no package. With no site key nothing renders, because the backend check is off locally.

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileOptions = {
  sitekey: string;
  appearance: "interaction-only";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** The public Turnstile site key, or undefined when the bot check is off. */
export function botCheckSiteKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  return key === "" ? undefined : key;
}

function addScript(): HTMLScriptElement {
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  return script;
}

function loadScript(onReady: () => void): () => void {
  if (window.turnstile) {
    onReady();
    return () => undefined;
  }
  const script = document.getElementById(SCRIPT_ID) ?? addScript();
  script.addEventListener("load", onReady);
  return () => script.removeEventListener("load", onReady);
}

export type BotCheckProps = {
  /** Gets the new token, or undefined when it expired or failed. */
  onToken: (token: string | undefined) => void;
  /** Change this number to get a fresh token, for example after a failed submit (tokens are single use). */
  resetKey: number;
};

export function BotCheck({ onToken, resetKey }: BotCheckProps) {
  const siteKey = botCheckSiteKey();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (siteKey === undefined) return undefined;
    const stopWaiting = loadScript(() => {
      const element = container.current;
      if (!window.turnstile || element === null || widgetId.current !== undefined) return;
      widgetId.current = window.turnstile.render(element, {
        sitekey: siteKey,
        // Stays hidden unless Cloudflare needs the visitor to do something.
        appearance: "interaction-only",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(undefined),
        "error-callback": () => onTokenRef.current(undefined),
      });
    });
    return () => {
      stopWaiting();
      if (window.turnstile && widgetId.current !== undefined) {
        window.turnstile.remove(widgetId.current);
      }
      widgetId.current = undefined;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey === 0 || !window.turnstile || widgetId.current === undefined) return;
    onTokenRef.current(undefined);
    window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  if (siteKey === undefined) return null;
  return <div ref={container} />;
}
