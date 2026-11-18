import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Stop `next dev` from writing its own block into AGENTS.md, which is the founder's
  // instruction file for this repo and must only change on purpose.
  agentRules: false,
  // The password reset link carries a token in its address. Never send it on as a referrer.
  async headers() {
    return [
      {
        source: "/reset-password",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

// Sentry's build step (SRS Section 11). It only adds the error tracking code; with no
// NEXT_PUBLIC_SENTRY_DSN the app sends nothing. No source maps are uploaded and no release is
// created for now, so no Sentry auth token is needed. Its own build telemetry is off, in line
// with Next.js telemetry being off (scripts/next.mjs).
export default withSentryConfig(nextConfig, {
  telemetry: false,
  silent: true,
  sourcemaps: { disable: true },
  release: { create: false, finalize: false },
});
