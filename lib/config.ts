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

/** Reads the config from this environment. Throws a ConfigError with a plain message if invalid. */
export function getConfig(): AppConfig {
  // Next.js inlines NEXT_PUBLIC_ values only when they are read by their full literal name.
  return readConfig({ NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL });
}
