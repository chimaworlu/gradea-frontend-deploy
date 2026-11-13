import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Stop `next dev` from writing its own block into AGENTS.md, which is the founder's
  // instruction file for this repo and must only change on purpose.
  agentRules: false,
};

export default nextConfig;
