import { describe, expect, it } from "vitest";
import { ConfigError, readConfig, readTurnstileSiteKey } from "../lib/config";

describe("readTurnstileSiteKey", () => {
  it("is empty when the key is missing, so the bot check is skipped locally", () => {
    expect(readTurnstileSiteKey({})).toBe("");
  });

  it("is empty when the key is blank", () => {
    expect(readTurnstileSiteKey({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: "   " })).toBe("");
  });

  it("returns a set key without surrounding spaces", () => {
    expect(readTurnstileSiteKey({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: " site-key-1 " })).toBe(
      "site-key-1",
    );
  });

  it("rejects a key with spaces inside, without printing it", () => {
    const value = "site key";
    expect(() => readTurnstileSiteKey({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: value })).toThrow(
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY must not contain spaces.",
    );
  });
});

describe("readConfig", () => {
  it("returns the API address without a trailing slash", () => {
    expect(readConfig({ NEXT_PUBLIC_API_URL: "https://api.example.test/" })).toEqual({
      apiUrl: "https://api.example.test",
    });
  });

  it("accepts a local http address", () => {
    expect(readConfig({ NEXT_PUBLIC_API_URL: "http://localhost:3001" }).apiUrl).toBe(
      "http://localhost:3001",
    );
  });

  it("fails with a plain message when the address is missing", () => {
    expect(() => readConfig({})).toThrow(ConfigError);
    expect(() => readConfig({})).toThrow("NEXT_PUBLIC_API_URL is not set.");
  });

  it("fails when the address is empty or only spaces", () => {
    expect(() => readConfig({ NEXT_PUBLIC_API_URL: "   " })).toThrow(
      "NEXT_PUBLIC_API_URL is not set.",
    );
  });

  it("fails on an invalid address without printing the value", () => {
    const value = "not-a-real-address-value";
    expect(() => readConfig({ NEXT_PUBLIC_API_URL: value })).toThrow(ConfigError);
    try {
      readConfig({ NEXT_PUBLIC_API_URL: value });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect(String(error)).not.toContain(value);
      return;
    }
    throw new Error("readConfig should have thrown.");
  });

  it("fails on an address that is not http or https", () => {
    const value = "ftp://files.example.test";
    expect(() => readConfig({ NEXT_PUBLIC_API_URL: value })).toThrow(
      "NEXT_PUBLIC_API_URL must start with http:// or https://.",
    );
  });
});
