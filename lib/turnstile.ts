/**
 * Cloudflare Turnstile, invisible (SRS Section 4: the waitlist endpoint checks a bot token).
 * The script is loaded with next/script only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 */

export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Give up waiting for a token after this long; the visitor sees the general error. */
export const TURNSTILE_TOKEN_TIMEOUT_MS = 30_000;

type TurnstileRenderOptions = {
  sitekey: string;
  execution: "execute";
  appearance: "interaction-only";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export class BotCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BotCheckError";
  }
}

/**
 * Returns a function that gets one fresh token per call. Tokens are single use, so each call
 * removes the previous widget and runs a new one in the given container.
 */
export function createTurnstileTokenGetter(
  siteKey: string,
  containerRef: { readonly current: HTMLElement | null },
): () => Promise<string> {
  let widgetId: string | undefined;

  return () =>
    new Promise<string>((resolve, reject) => {
      const api = window.turnstile;
      const container = containerRef.current;
      if (!api || !container) {
        reject(new BotCheckError("The bot check is not ready."));
        return;
      }

      let settled = false;
      const settle = (finish: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        finish();
      };
      const fail = () => settle(() => reject(new BotCheckError("The bot check failed.")));
      const timer = setTimeout(fail, TURNSTILE_TOKEN_TIMEOUT_MS);

      if (widgetId !== undefined) {
        api.remove(widgetId);
      }
      widgetId = api.render(container, {
        sitekey: siteKey,
        execution: "execute",
        appearance: "interaction-only",
        callback: (token) => settle(() => resolve(token)),
        "error-callback": fail,
        "expired-callback": fail,
        "timeout-callback": fail,
      });
      if (widgetId === undefined) {
        fail();
        return;
      }
      api.execute(widgetId);
    });
}
