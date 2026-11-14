#!/usr/bin/env node
/**
 * Runs the Next.js command line with anonymous telemetry turned off.
 *
 * SRS Section 2: Next.js telemetry is off (NEXT_TELEMETRY_DISABLED=1), to match the privacy
 * promise. Setting it here means every npm script (dev, build, start, typecheck) has it on
 * every machine, in CI and in the deploy build, with no extra package and no shell syntax
 * that only works on one operating system.
 *
 * Usage: node scripts/next.mjs <next command> [options], for example `node scripts/next.mjs dev`.
 */
import { createRequire } from "node:module";

process.env.NEXT_TELEMETRY_DISABLED = "1";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

// Hand over to the real Next.js CLI in this same process, with the same arguments.
process.argv = [process.argv[0] ?? process.execPath, nextBin, ...process.argv.slice(2)];
require(nextBin);
