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

export default nextConfig;
