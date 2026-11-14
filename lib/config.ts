/**
 * The one place the frontend reads its environment settings.
 *
 * The API address is one environment setting per environment, never typed in code
 * (SRS Section 13). Error messages name the setting but never print its value.
 */

export type AppConfig = {
  /** Base address of the Gradea API, without a trailing slash. */
  apiUrl: string;
};

export type ConfigEnv = {
  NEXT_PUBLIC_API_URL?: string | undefined;
};

export type TurnstileEnv = {
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string | undefined;
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** Validates the given environment values. Exported separately so it can be tested. */
export function readConfig(env: ConfigEnv): AppConfig {
  const raw = env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) {
    throw new ConfigError(
      "NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local and set the API address.",
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError("NEXT_PUBLIC_API_URL is not a valid web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ConfigError("NEXT_PUBLIC_API_URL must start with http:// or https://.");
  }

  return { apiUrl: raw.replace(/\/+$/, "") };
}

/**
 * The Cloudflare Turnstile site key (public by design). An empty or missing key means
 * "no bot check" for local development: the form then sends no bot_token. Never throws.
 */
export function readTurnstileSiteKey(env: TurnstileEnv): string {
  const raw = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  if (/\s/.test(raw)) {
    throw new ConfigError("NEXT_PUBLIC_TURNSTILE_SITE_KEY must not contain spaces.");
  }
  return raw;
}

// Next.js inlines NEXT_PUBLIC_ values only when they are read by their full literal name.

/** Reads the API config from this environment. Throws a ConfigError with a plain message if invalid. */
export function getConfig(): AppConfig {
  return readConfig({ NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL });
}

/** Reads the Turnstile site key from this environment ("" when the bot check is off). */
export function getTurnstileSiteKey(): string {
  return readTurnstileSiteKey({
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
}
