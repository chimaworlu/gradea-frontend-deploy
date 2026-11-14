#!/usr/bin/env node
/**
 * build-design-tokens.mjs
 * =============================================================================
 * Converts `gradea-design-tokens.json` (the single source of truth for Gradea's
 * design system) into CSS custom properties at `styles/tokens.css`.
 *
 * Never hand-edit the generated CSS. Change the JSON, then run this script.
 *
 * -----------------------------------------------------------------------------
 * USAGE (run from the repository root or any folder; paths are resolved
 * relative to this file, not to the current working directory)
 * -----------------------------------------------------------------------------
 *
 *   node scripts/build-design-tokens.mjs
 *       Generate styles/tokens.css.
 *
 *   node scripts/build-design-tokens.mjs --check
 *       Do not write anything. Exit 1 if tokens.css is missing or out of date
 *       with the JSON. Use this in CI so the two can never drift apart.
 *
 *   node scripts/build-design-tokens.mjs --audit [dir]
 *       Scan the repo (default: the repository root) for values that bypass
 *       the tokens: primitive colour variables (`--primitive-*`), raw colours
 *       (hex, rgb(), hsl()) and raw px on font-size, padding, margin, gap,
 *       border-radius and box-shadow. Prints file, line and value; exits 1 if
 *       anything is found. Rules and exemptions are documented above audit()
 *       near the end of this file. See "THE TWO-TIER COLOUR SYSTEM" below for
 *       why primitives are banned.
 *
 *   Options:
 *     --input  <path>   Token JSON to read.   Default: <repo>/gradea-design-tokens.json
 *     --output <path>   CSS file to write.    Default: <repo>/styles/tokens.css
 *     --help            Print usage.
 *
 * Requires Node 20+ (uses recursive readdirSync). No dependencies.
 *
 * -----------------------------------------------------------------------------
 * THE TWO-TIER COLOUR SYSTEM  (the most important thing in this file)
 * -----------------------------------------------------------------------------
 *
 * The JSON defines colour in two layers, and the CSS keeps them apart:
 *
 *   TIER 1: PRIMITIVES  ->  --primitive-*
 *     "primitive colors" in the JSON: the key colours (Authority Navy, Verified
 *     Green, Flagged Amber, Ink Slate, Warm Paper, ...) and the full tonal
 *     palettes (primary0 ... primary100, etc.). These are raw ingredients.
 *     They carry NO meaning: `--primitive-tertiary-40` is just "an amber",
 *     it does not say "flagged".
 *
 *     >>> Primitives must NOT be used directly in components or page styles. <<<
 *
 *   TIER 2: COLOUR ROLES  ->  --color-*
 *     "color roles" in the JSON: `primary`, `on primary`, `surface`,
 *     `warning container`, `on warning container`, ... Each role points at a
 *     primitive and carries meaning ("the text colour that sits on a warning
 *     tint"). These are the ONLY colour variables UI code should use.
 *
 *   Why it matters:
 *     - Gradea's colour meanings are strict (green only means strong/passed,
 *       amber only means flagged, red only means real errors). Roles encode
 *       those meanings; primitives do not. Reaching for a primitive is how a
 *       "nice amber" ends up used as decoration and breaks the grading language.
 *     - Contrast rules are baked into the role pairs. For example, amber text
 *       fails 4.5:1, so the role `--color-on-warning-container` points at
 *       warning30 rather than the key amber. Using roles in their pairs
 *       (`X-container` background + `on-X-container` text) keeps text legible.
 *     - A future re-theme (or dark mode) only re-points roles at different
 *       primitives. Components using roles need no change.
 *
 *   How the script enforces it:
 *     - Every role is emitted as `var(--primitive-...)`, never a raw hex, so
 *       the link between the two tiers stays visible and single-sourced.
 *     - A role whose JSON value is a raw hex (e.g. `surface: #F7F7F4`) is
 *       matched back to the primitive with that exact value (here, Warm Paper).
 *       Pure white and pure black are not matched, because every palette has
 *       them (tone 100 / tone 0) and the match would be arbitrary; they stay
 *       literal, with a comment.
 *     - A role reference (`{primitive colors.<group>.<key>}`) that does not
 *       exist makes the script fail. No silent fallbacks.
 *     - `--audit` finds primitives used outside tokens.css.
 *
 * -----------------------------------------------------------------------------
 * WHAT ELSE IS CONVERTED, AND THE NAMING SCHEME
 * -----------------------------------------------------------------------------
 *
 *   JSON section                         CSS variables
 *   ----------------------------------   ---------------------------------------
 *   primitive colors                     --primitive-key-<name>, --primitive-<palette>-<tone>
 *   color roles                          --color-<role>
 *   shape > border discipline            --color-border-card, --color-border-input
 *   states (hover/pressed/focus)         --color-primary-hover, -pressed, --color-focus-ring*
 *   gradient                             --gradient-hero, --gradient-score-glow
 *   font                                 --font-family-*, --font-weight-*,
 *                                        --font-<style>-<size>-{family,size,weight,
 *                                        line-height,letter-spacing} and a
 *                                        --font-<style>-<size> `font` shorthand
 *   font > phone sizes                   overrides inside the phone media query
 *   spacing                              --space-<px>, plus semantic gutters/padding
 *   shape > corner radius scale          --radius-sm|md|lg|full
 *   shape > depth                        --shadow-floating
 *   layout                               --breakpoint-*, --layout-*
 *   components                           --size-* (button, input, icon, touch target)
 *   motion                               --duration-*, --easing-standard
 *
 *   Not converted (prose rules with no CSS value): voice and copy, notes,
 *   locked content, logo, social icons, marketing FAQ/forms prose, icon set name.
 *   Read those in the JSON itself.
 *
 *   Units:
 *     - Font sizes, line heights and letter spacing: px -> rem (16px root), so
 *       text respects the user's browser font-size setting. At the default root
 *       size the rendered px are exactly the JSON values.
 *     - Spacing and layout sizes: rem as well, for the same reason.
 *     - Radii, border widths, icon stroke, breakpoints: px (they should not
 *       scale with text size).
 *
 *   Responsive and preference overrides are emitted as media blocks on :root:
 *     - Phone (`width < 640px`, from layout > breakpoints): smaller display and
 *       headline sizes, 16px card padding and gutters, smaller section gaps.
 *     - `prefers-reduced-motion: reduce`: every duration becomes 0ms, per
 *       motion > reduced motion. JS-driven animation (e.g. the score count-up)
 *       must still check `matchMedia` itself.
 *
 * -----------------------------------------------------------------------------
 * DESIGN DECISIONS AND INTERPRETATIONS  (flagged so they can be challenged)
 * -----------------------------------------------------------------------------
 *
 *   1. Some values live in prose strings ("Card padding: 24 desktop, 16 phone.").
 *      They are read with strict regular expressions. If the wording changes so
 *      the pattern no longer matches, the build FAILS with the JSON path, rather
 *      than silently emitting a stale value. Update the pattern in this file.
 *   2. Hero gradient `rotation: 180` is emitted as CSS `180deg` (top to bottom),
 *      i.e. #0F172A at the top fading to #182F4E at the bottom.
 *   3. The radial score glow uses `circle closest-side` so the glow fades to
 *      transparent exactly at the edge of whatever box sits behind the ring.
 *   4. Gradient stops with transparency stay literal 8-digit hex (CSS cannot
 *      add alpha to a var() without color-mix); the comment names the
 *      primitive they derive from. Opaque stops become var(--primitive-...).
 *   5. "Pressed: a little darker than hover" is mapped to primary10 (one tone
 *      darker than hover's primary20). This is an interpretation, not a JSON
 *      value.
 *   6. Font family variables accept a next/font override: configure next/font
 *      with `variable: '--font-lora'` / `variable: '--font-inter'` and the
 *      self-hosted fonts are picked up automatically, with system fallbacks.
 *   7. Breakpoint variables are informational (CSS cannot use custom
 *      properties inside @media). Use them from JS via getComputedStyle, and
 *      copy the media queries printed in the generated file header for CSS.
 *
 * Output is deterministic (no timestamps), so `--check` is reliable.
 * =============================================================================
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// -----------------------------------------------------------------------------
// Paths and constants
// -----------------------------------------------------------------------------

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
/** Repository root (gradea-frontend): the folder that holds scripts/, styles/ and the token JSON. */
const REPO_DIR = resolve(SCRIPT_DIR, '..');

const DEFAULT_INPUT = join(REPO_DIR, 'gradea-design-tokens.json');
const DEFAULT_OUTPUT = join(REPO_DIR, 'styles', 'tokens.css');

/** Browser default root font size, used for px -> rem conversion. */
const ROOT_FONT_SIZE_PX = 16;

/** Prefix for tier-1 colour variables. Also what `--audit` searches for. */
const PRIMITIVE_PREFIX = '--primitive-';

/** Hex values present in every palette; matching a role to one of them is meaningless. */
const AMBIGUOUS_HEX = new Set(['#ffffff', '#000000']);

/**
 * Fallback stacks per font family, used if the self-hosted font has not loaded.
 * Lora is a serif, Inter is a neo-grotesque sans.
 */
const FONT_FALLBACKS = {
  Lora: 'Georgia, "Times New Roman", serif',
  Inter:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

/** Font weights to expose by name. Matches font > usage rules > loading. */
const FONT_WEIGHT_NAMES = { 400: 'regular', 500: 'medium', 600: 'semibold', 700: 'bold' };

// -----------------------------------------------------------------------------
// Errors and small helpers
// -----------------------------------------------------------------------------

/** Thrown for any problem with the token file. Always names the JSON path. */
class TokenError extends Error {
  constructor(path, message) {
    super(`[${path}] ${message}`);
    this.name = 'TokenError';
  }
}

/**
 * Safe nested lookup. `get(tokens, 'shape', 'depth')` returns the value or
 * throws a TokenError naming the exact missing path. JSON keys in this file
 * contain spaces and parentheses, so keys are passed as separate arguments
 * rather than as a dotted string.
 */
function get(obj, ...path) {
  let current = obj;
  for (let i = 0; i < path.length; i++) {
    if (current === null || typeof current !== 'object' || !(path[i] in current)) {
      throw new TokenError(path.slice(0, i + 1).join(' > '), 'Missing in token file.');
    }
    current = current[path[i]];
  }
  return current;
}

/**
 * Read a number out of a prose string with a strict pattern.
 * @param {string} text      The JSON string, e.g. "Card padding: 24 desktop, 16 phone."
 * @param {RegExp} pattern   Must contain capture groups for the numbers wanted.
 * @param {string} path      JSON path, for the error message.
 * @returns {number[]}       The captured numbers, in order.
 */
function extractNumbers(text, pattern, path) {
  const match = typeof text === 'string' ? text.match(pattern) : null;
  if (!match) {
    throw new TokenError(
      path,
      `Expected text matching ${pattern} but found ${JSON.stringify(text)}. ` +
        'The wording changed; update the pattern in build-design-tokens.mjs.',
    );
  }
  return match.slice(1).map(Number);
}

/** Find the one string in an array that matches a pattern (for "spacing > rules"). */
function findRule(rules, pattern, path) {
  const rule = Array.isArray(rules) ? rules.find((r) => pattern.test(r)) : undefined;
  if (!rule) throw new TokenError(path, `No rule matching ${pattern}.`);
  return rule;
}

/** Turn a human JSON key into a CSS-safe slug: "neutral variant (x)" -> "neutral-variant". */
function slug(text) {
  return text
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // drop parenthetical notes like "(navy)"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Round to at most 5 decimals (exact for any whole or half px / 16) and drop trailing zeros. */
function round(n) {
  return Number(n.toFixed(5)).toString();
}

const px = (n) => (n === 0 ? '0' : `${round(n)}px`);
const rem = (n) => (n === 0 ? '0' : `${round(n / ROOT_FONT_SIZE_PX)}rem`);

/**
 * Validate and normalise a hex colour: lowercase, and drop a fully opaque
 * alpha channel ("#0f172aff" -> "#0f172a"). Throws on anything else.
 */
function normaliseHex(value, path) {
  if (typeof value !== 'string' || !/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) {
    throw new TokenError(path, `Expected a 6 or 8 digit hex colour, got ${JSON.stringify(value)}.`);
  }
  const hex = value.toLowerCase();
  return hex.length === 9 && hex.endsWith('ff') ? hex.slice(0, 7) : hex;
}

/** Make arbitrary text safe inside a CSS comment. */
function safeComment(text) {
  return String(text).replace(/\*\//g, '* /').replace(/\s+/g, ' ').trim();
}

/** Word-wrap a paragraph into comment lines of a given width. */
function wrap(text, width = 74) {
  const words = safeComment(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// -----------------------------------------------------------------------------
// Output model
// -----------------------------------------------------------------------------
//
// The CSS is built as a list of "sections". Each section has a title, optional
// documentation lines, and declarations. `CssBuilder` also guarantees that no
// variable name is declared twice in the same scope (a silent override would
// be a nasty bug to find later).

class CssBuilder {
  constructor() {
    /** @type {Map<string, {title: string, docs: string[], decls: {name: string, value: string, note?: string}[]}[]>} */
    this.scopes = new Map();
    this.names = new Map(); // scope -> Set of declared names
  }

  /** Register a scope up front. Scopes render in the order they are first declared. */
  declareScope(scope) {
    if (!this.scopes.has(scope)) {
      this.scopes.set(scope, []);
      this.names.set(scope, new Set());
    }
  }

  /** Start a new documented section inside a scope (":root", a media query, ...). */
  section(scope, title, docs = []) {
    this.declareScope(scope);
    const section = { title, docs, decls: [] };
    this.scopes.get(scope).push(section);
    const names = this.names.get(scope);
    return {
      /** Add one custom property. `note` becomes a trailing comment. */
      add: (name, value, note) => {
        if (names.has(name)) throw new Error(`Duplicate CSS variable ${name} in ${scope}.`);
        names.add(name);
        section.decls.push({ name, value, note });
      },
    };
  }

  /** Has `name` been declared in the base (:root) scope? Used to validate overrides. */
  hasRoot(name) {
    return this.names.get(':root')?.has(name) ?? false;
  }

  render(header) {
    const out = [header];
    for (const [scope, sections] of this.scopes) {
      const isMedia = scope.startsWith('@media');
      const indent = isMedia ? '    ' : '  ';
      if (isMedia) out.push(`${scope} {`, '  :root {');
      else out.push(`${scope} {`);

      sections.forEach((section, index) => {
        if (index > 0) out.push('');
        out.push(`${indent}/* ${'-'.repeat(70)}`);
        out.push(`${indent} * ${safeComment(section.title)}`);
        for (const line of section.docs) out.push(`${indent} * ${line}`.trimEnd());
        out.push(`${indent} * ${'-'.repeat(70)} */`);
        const width = Math.max(...section.decls.map((d) => d.name.length));
        for (const { name, value, note } of section.decls) {
          const decl = `${indent}${`${name}:`.padEnd(width + 1)} ${value};`;
          out.push(note ? `${decl} /* ${safeComment(note)} */` : decl);
        }
      });

      if (isMedia) out.push('  }', '}');
      else out.push('}');
      out.push('');
    }
    return out.join('\n');
  }
}

// -----------------------------------------------------------------------------
// TIER 1: primitive colours
// -----------------------------------------------------------------------------

/**
 * Emit every primitive colour and build the lookup tables roles need.
 *
 * @returns {{
 *   byRef: Map<string, string>,     // "<group>.<key>" -> "--primitive-..."
 *   byHex: Map<string, string>,     // "#rrggbb" -> first "--primitive-..." with that value
 *   hexOf: Map<string, string>,     // "--primitive-..." -> "#rrggbb"
 *   labelOf: Map<string, string>,   // "--primitive-..." -> "primary90" (JSON key, for comments)
 * }}
 */
function buildPrimitives(tokens, css) {
  const groups = get(tokens, 'primitive colors');
  const byRef = new Map();
  const byHex = new Map();
  const hexOf = new Map();
  const labelOf = new Map();

  const register = (group, key, name, hex) => {
    byRef.set(`${group}.${key}`, name);
    hexOf.set(name, hex);
    labelOf.set(name, key);
    // Key colours are registered first, so a hex that is both a key colour and
    // a palette tone resolves to the (more meaningful) key colour.
    if (!AMBIGUOUS_HEX.has(hex) && !byHex.has(hex)) byHex.set(hex, name);
  };

  // Key colours: the named brand anchors.
  const keyColors = get(groups, 'key colors');
  const keySection = css.section(':root', 'TIER 1 / PRIMITIVES: key colours', [
    'Source: "primitive colors > key colors".',
    '',
    'DO NOT USE IN COMPONENTS. Primitives are raw ingredients with no meaning.',
    'Use the --color-* role variables further down instead. Run this build',
    'with --audit to find stray uses.',
  ]);
  for (const [key, entry] of Object.entries(keyColors)) {
    const path = `primitive colors > key colors > ${key}`;
    const name = `${PRIMITIVE_PREFIX}key-${slug(key.replace(/key color/i, ''))}`;
    const hex = normaliseHex(get(entry, 'value'), path);
    keySection.add(name, hex, entry.name);
    register('key colors', key, name, hex);
  }

  // Tonal palettes: tone 0 (black) to 100 (white).
  for (const [group, palette] of Object.entries(groups)) {
    if (group === 'key colors') continue;
    const section = css.section(':root', `TIER 1 / PRIMITIVES: ${group}`, [
      `Source: "primitive colors > ${group}". Tone 0 is black, 100 is white.`,
      'DO NOT USE IN COMPONENTS. Use --color-* roles.',
    ]);
    for (const [key, value] of Object.entries(palette)) {
      const path = `primitive colors > ${group} > ${key}`;
      const match = key.match(/^(.*?)(\d+)$/);
      if (!match) throw new TokenError(path, 'Palette keys must end in a tone number, e.g. "primary40".');
      const [, base, tone] = match;
      const name = `${PRIMITIVE_PREFIX}${slug(base)}-${tone}`;
      const hex = normaliseHex(value, path);
      section.add(name, hex);
      register(group, key, name, hex);
    }
  }

  return { byRef, byHex, hexOf, labelOf };
}

/**
 * Resolve any colour value into something a role can safely use.
 *   "{primitive colors.<group>.<key>}"  -> var(--primitive-...)   (must exist)
 *   "#F7F7F4"                            -> var(--primitive-key-paper) if a primitive matches
 *   "#E3E0D6" (no primitive matches)     -> "#e3e0d6" literal, flagged in the note
 *
 * @returns {{ value: string, note: string }}
 */
function resolveColor(raw, path, primitives) {
  if (typeof raw === 'string' && raw.startsWith('{')) {
    const ref = raw.replace(/^\{|\}$/g, '');
    const [root, group, key, ...rest] = ref.split('.');
    if (root !== 'primitive colors' || !group || !key || rest.length) {
      throw new TokenError(path, `Unsupported reference ${raw}. Expected {primitive colors.<group>.<key>}.`);
    }
    const name = primitives.byRef.get(`${group}.${key}`);
    if (!name) throw new TokenError(path, `Reference ${raw} does not point at an existing primitive.`);
    return { value: `var(${name})`, note: `${primitives.labelOf.get(name)} ${primitives.hexOf.get(name)}` };
  }

  const hex = normaliseHex(raw, path);
  const name = primitives.byHex.get(hex);
  if (name) {
    return { value: `var(${name})`, note: `${primitives.labelOf.get(name)} ${hex} (literal in JSON, matched to primitive)` };
  }
  const why = AMBIGUOUS_HEX.has(hex) ? 'pure white/black, exists in every palette' : 'no matching primitive';
  return { value: hex, note: `literal ${hex}: ${why}` };
}

// -----------------------------------------------------------------------------
// TIER 2: colour roles (the only colours UI code should use)
// -----------------------------------------------------------------------------

/**
 * "on primary color role"     -> "on-primary"
 * "success (score: passing)"  -> "success"
 * "surface container highest" -> "surface-container-highest"
 */
function roleName(key) {
  return `--color-${slug(key.replace(/color role/i, ''))}`;
}

function buildRoles(tokens, css, primitives) {
  // Pull the written colour rules into the CSS so they sit next to the values.
  const rules = get(tokens, 'color meaning rules');
  const ruleDocs = ['Source: "color roles". THESE are the colours to use in the UI.', ''];
  ruleDocs.push('Pairing rule: put text on a fill with its "on-" partner, e.g.');
  ruleDocs.push('  background: var(--color-warning-container);');
  ruleDocs.push('  color:      var(--color-on-warning-container);');
  ruleDocs.push('', 'Colour meaning rules (from "color meaning rules" in the JSON):');
  for (const [rule, text] of Object.entries(rules)) {
    const [first, ...more] = wrap(`${rule}: ${text}`, 70);
    ruleDocs.push(`  - ${first}`, ...more.map((l) => `    ${l}`));
  }

  const section = css.section(':root', 'TIER 2 / COLOUR ROLES', ruleDocs);
  for (const [key, raw] of Object.entries(get(tokens, 'color roles'))) {
    const { value, note } = resolveColor(raw, `color roles > ${key}`, primitives);
    section.add(roleName(key), value, note);
  }

  // Roles that the JSON defines outside "color roles", in shape and states.
  const borders = css.section(':root', 'TIER 2 / COLOUR ROLES: borders, interaction states', [
    'Source: "shape > border discipline" and "states".',
    '--color-border-card: soft warm line for white cards and list dividers.',
    '--color-border-input: inputs and outlined buttons (about 4.3:1 on white).',
    'Primary hover/pressed: navy buttons darken on hover (primary20) and a',
    'little more when pressed (primary10, an interpretation of "a little',
    'darker than hover"). Focus ring: 2px navy with a 2px gap; white on navy.',
  ]);
  const borderPath = ['shape', 'border discipline'];
  const card = get(tokens, ...borderPath, 'card and divider line', 'color');
  const input = get(tokens, ...borderPath, 'input and outlined button line', 'color');
  for (const [name, raw, path] of [
    ['--color-border-card', card, 'shape > border discipline > card and divider line'],
    ['--color-border-input', input, 'shape > border discipline > input and outlined button line'],
  ]) {
    const { value, note } = resolveColor(raw, path, primitives);
    borders.add(name, value, note);
  }

  // states > hover names the tone explicitly ("(primary20)"); read it rather than assume.
  const hover = get(tokens, 'states', 'hover');
  const [hoverTone] = extractNumbers(hover, /\(primary(\d+)\)/, 'states > hover');
  const hoverRef = `{primitive colors.primary color palette (navy).primary${hoverTone}}`;
  const pressedRef = '{primitive colors.primary color palette (navy).primary10}';
  borders.add('--color-primary-hover', resolveColor(hoverRef, 'states > hover', primitives).value, `primary${hoverTone}`);
  borders.add('--color-primary-pressed', resolveColor(pressedRef, 'states > pressed', primitives).value, 'primary10 (interpretation)');
  borders.add('--color-focus-ring', 'var(--color-primary)', 'on light backgrounds');
  borders.add('--color-focus-ring-on-dark', 'var(--color-on-primary)', 'white ring on navy backgrounds');
}

// -----------------------------------------------------------------------------
// Gradients
// -----------------------------------------------------------------------------

function buildGradients(tokens, css, primitives) {
  const section = css.section(':root', 'GRADIENTS', [
    'Source: "gradient". Only two exist, both single-hue and restrained.',
    '--gradient-hero: hero section background only.',
    '--gradient-score-glow: behind a GREEN (75+) score ring on scan completion',
    'only. Never on cards or buttons.',
  ]);

  /** Opaque stops use the matching primitive; translucent stops stay literal. */
  const stop = (s, path) => {
    const hex = normaliseHex(s.color, path);
    const pct = `${round(s.position * 100)}%`;
    if (hex.length === 7) {
      const { value } = resolveColor(hex, path, primitives);
      return { css: `${value} ${pct}`, note: null };
    }
    const base = primitives.byHex.get(hex.slice(0, 7));
    const alpha = round(parseInt(hex.slice(7), 16) / 255);
    return { css: `${hex} ${pct}`, note: `${hex}: ${base ? primitives.labelOf.get(base) : hex.slice(0, 7)} at ${alpha} alpha` };
  };

  const build = (key, path) => {
    const value = get(tokens, 'gradient', key, 'value');
    const stops = get(value, 'stops').map((s, i) => stop(s, `${path} > stops > ${i}`));
    const list = stops.map((s) => s.css).join(', ');
    const notes = stops.map((s) => s.note).filter(Boolean).join('; ');
    const type = get(value, 'gradientType');
    if (type === 'linear') return { css: `linear-gradient(${round(get(value, 'rotation'))}deg, ${list})`, notes };
    if (type === 'radial') return { css: `radial-gradient(circle closest-side, ${list})`, notes };
    throw new TokenError(path, `Unsupported gradientType "${type}".`);
  };

  const hero = build('hero gradient', 'gradient > hero gradient');
  section.add('--gradient-hero', hero.css, hero.notes || undefined);
  const glow = build('score reveal glow', 'gradient > score reveal glow');
  section.add('--gradient-score-glow', glow.css, glow.notes || undefined);
}

// -----------------------------------------------------------------------------
// Typography
// -----------------------------------------------------------------------------

function buildTypography(tokens, css, phoneScope) {
  const font = get(tokens, 'font');
  const STYLE_GROUPS = ['display', 'headline', 'title', 'body', 'label'];

  // Families: collect every family actually used by the type scale.
  const families = new Set();
  for (const group of STYLE_GROUPS) {
    for (const style of Object.values(get(font, group))) families.add(get(style, 'fontFamily'));
  }
  const familySection = css.section(':root', 'TYPOGRAPHY: families and weights', [
    'Source: "font" and "font > usage rules".',
    'Lora: big moments only (hero headline, section titles, the score number).',
    'Inter: everything else, and ALWAYS for prices (Lora has no Naira sign).',
    'Self-host with next/font using `variable: "--font-lora"` and',
    '`variable: "--font-inter"`; these variables pick them up automatically.',
    'Use `font-variant-numeric: tabular-nums` for prices, counts and tables.',
  ]);
  for (const family of families) {
    const id = slug(family);
    const fallback = FONT_FALLBACKS[family] ?? 'sans-serif';
    familySection.add(`--font-family-${id}`, `var(--font-${id}, "${family}"), ${fallback}`);
  }
  for (const [weight, label] of Object.entries(FONT_WEIGHT_NAMES)) {
    familySection.add(`--font-weight-${label}`, weight);
  }

  // The scale: one documented section per group (display, headline, ...).
  for (const group of STYLE_GROUPS) {
    const section = css.section(':root', `TYPOGRAPHY: ${group}`, [
      `Source: "font > ${group}". Each size has its parts plus a \`font\` shorthand:`,
      `  font: var(--font-${group}-large);`,
      `  letter-spacing: var(--font-${group}-large-letter-spacing);`,
      '(letter-spacing is not part of the CSS `font` shorthand, set it too.)',
    ]);
    for (const [size, style] of Object.entries(get(font, group))) {
      const p = `--font-${group}-${slug(size)}`;
      const path = `font > ${group} > ${size}`;
      const num = (k) => {
        const v = get(style, k);
        if (typeof v !== 'number') throw new TokenError(`${path} > ${k}`, 'Expected a number.');
        return v;
      };
      section.add(`${p}-family`, `var(--font-family-${slug(get(style, 'fontFamily'))})`);
      section.add(`${p}-size`, rem(num('fontSize')), `${num('fontSize')}px`);
      section.add(`${p}-weight`, String(num('fontWeight')));
      section.add(`${p}-line-height`, rem(num('lineHeight')), `${num('lineHeight')}px`);
      section.add(`${p}-letter-spacing`, rem(num('letterSpacing')), `${num('letterSpacing')}px`);
      section.add(p, `var(${p}-weight) var(${p}-size)/var(${p}-line-height) var(${p}-family)`);
    }
  }

  // Phone overrides: only display and headline change (title/body/label do not).
  const phone = get(font, 'phone sizes');
  const phoneSection = css.section(phoneScope, 'TYPOGRAPHY: phone sizes', [
    'Source: "font > phone sizes". Display and headline shrink on phones.',
    'Title, body and label sizes do not change. The `font` shorthands above',
    'pick these up automatically.',
  ]);
  for (const group of ['display', 'headline']) {
    for (const [size, style] of Object.entries(get(phone, group))) {
      const p = `--font-${group}-${slug(size)}`;
      for (const [suffix, key] of [['size', 'fontSize'], ['line-height', 'lineHeight']]) {
        if (!css.hasRoot(`${p}-${suffix}`)) {
          throw new TokenError(`font > phone sizes > ${group} > ${size}`, `No desktop token ${p}-${suffix} to override.`);
        }
        const v = get(style, key);
        phoneSection.add(`${p}-${suffix}`, rem(v), `${v}px`);
      }
    }
  }

  // Text inputs: a hard minimum on phones so iOS/Android do not zoom on focus.
  const input = get(phone, 'text input');
  familySection.add(
    '--font-text-input-size-phone',
    rem(get(input, 'fontSize')),
    `${get(input, 'fontSize')}px minimum on phones, stops browser zoom on focus`,
  );
}

// -----------------------------------------------------------------------------
// Spacing, shape, depth
// -----------------------------------------------------------------------------

function buildSpacing(tokens, css, phoneScope) {
  const scale = get(tokens, 'spacing', 'scale');
  const section = css.section(':root', 'SPACING: scale', [
    'Source: "spacing > scale". Named by their px value: --space-16 is 16px.',
    'ONLY these values. 4 is for tiny pairs only (an icon and its label).',
  ]);
  for (const n of scale) section.add(`--space-${n}`, rem(n), `${n}px`);

  // Semantic spacing, read from "spacing > rules" prose with strict patterns.
  const rules = get(tokens, 'spacing', 'rules');
  const path = 'spacing > rules';
  const [cardD, cardP] = extractNumbers(findRule(rules, /^Card padding/, path), /Card padding:\s*(\d+) desktop,\s*(\d+) phone/, path);
  const [gutD, gutP] = extractNumbers(findRule(rules, /^Page side gutter/, path), /gutter:\s*(\d+) desktop,\s*(\d+) phone/, path);
  const [mktD, mktP, appD, appP] = extractNumbers(
    findRule(rules, /^Section gap/, path),
    /marketing (\d+) desktop \/ (\d+) phone; app screens (\d+) desktop \/ (\d+) phone/,
    path,
  );

  const semantic = css.section(':root', 'SPACING: semantic (responsive)', [
    'Source: "spacing > rules". Desktop values here; phone values in the',
    'phone media query below. Prefer these over raw --space-* where they apply.',
  ]);
  const phone = css.section(phoneScope, 'SPACING: semantic, phone', ['Source: "spacing > rules".']);
  for (const [name, desktop, mobile] of [
    ['--space-card-padding', cardD, cardP],
    ['--space-page-gutter', gutD, gutP],
    ['--space-section-marketing', mktD, mktP],
    ['--space-section-app', appD, appP],
  ]) {
    for (const n of [desktop, mobile]) {
      if (!scale.includes(n)) throw new TokenError(path, `${name} uses ${n}px, which is not on the spacing scale.`);
    }
    semantic.add(name, `var(--space-${desktop})`);
    phone.add(name, `var(--space-${mobile})`);
  }
}

function buildShape(tokens, css) {
  const radius = get(tokens, 'shape', 'corner radius scale');
  const section = css.section(':root', 'SHAPE: corner radius, borders, depth', [
    'Source: "shape". Radii: sm 6 tags/chips/badges; md 8 buttons, inputs,',
    'cards; lg 10 popups, modals, the CV page; full only for naturally round',
    'things (score ring, avatars). Never 0, never above 10, no pill shapes.',
    'Shadow: ONLY for floating layers (popovers, dropdowns, modals, toasts).',
    'Cards, panels and buttons are flat with a 1px line.',
  ]);
  for (const size of ['sm', 'md', 'lg']) section.add(`--radius-${size}`, px(get(radius, size)));
  section.add('--radius-full', '50%', 'score ring and avatars only');

  const borderPath = ['shape', 'border discipline'];
  section.add('--border-width', get(tokens, ...borderPath, 'card and divider line', 'weight'));
  const selected = get(tokens, 'components', 'cards', 'selected');
  const [selectedW] = extractNumbers(selected, /^(\d+)px navy outline/, 'components > cards > selected');
  section.add('--border-width-selected', px(selectedW), 'selected cards, recommended plan');

  const focus = get(tokens, 'states', 'keyboard focus');
  const [ringW, gapW] = extractNumbers(focus, /^(\d+)px navy ring with a (\d+)px gap/, 'states > keyboard focus');
  section.add('--focus-ring-width', px(ringW));
  section.add('--focus-ring-offset', px(gapW));

  section.add('--shadow-floating', get(tokens, 'shape', 'depth', 'suggested shadow'));
  const disabled = get(tokens, 'states', 'disabled');
  const [fade] = extractNumbers(disabled, /^(\d+)% faded/, 'states > disabled');
  section.add('--opacity-disabled', round(1 - fade / 100), `${fade}% faded`);
}

// -----------------------------------------------------------------------------
// Layout and component sizes
// -----------------------------------------------------------------------------

function buildLayout(tokens, css) {
  const layout = get(tokens, 'layout');
  const bp = get(layout, 'breakpoints');
  const [tabletMin] = extractNumbers(get(bp, 'tablet'), /^(\d+) to \d+/, 'layout > breakpoints > tablet');
  const [desktopMin] = extractNumbers(get(bp, 'desktop'), /^(\d+) and up/, 'layout > breakpoints > desktop');
  const [phoneBelow] = extractNumbers(get(bp, 'phone'), /^under (\d+)/, 'layout > breakpoints > phone');
  if (phoneBelow !== tabletMin) {
    throw new TokenError('layout > breakpoints', `Phone ends at ${phoneBelow} but tablet starts at ${tabletMin}.`);
  }

  const section = css.section(':root', 'LAYOUT', [
    'Source: "layout" and "marketing site > frame".',
    'Breakpoint variables are for JS only; CSS cannot use var() in @media.',
    `In CSS write: phone (width < ${tabletMin}px), tablet (${tabletMin}px <= width < ${desktopMin}px),`,
    `desktop (width >= ${desktopMin}px).`,
  ]);
  section.add('--breakpoint-tablet', px(tabletMin), 'tablet starts here');
  section.add('--breakpoint-desktop', px(desktopMin), 'desktop starts here');

  const widths = get(layout, 'max content width');
  const [marketing] = extractNumbers(get(widths, 'marketing'), /^(\d+) wide/, 'layout > max content width > marketing');
  section.add('--layout-max-width-marketing', rem(marketing), `${marketing}px`);
  const app = get(widths, 'dashboard, billing, profile');
  section.add('--layout-max-width-app', rem(app), `${app}px: dashboard, billing, profile`);
  const text = get(widths, 'text pages (About, Privacy, Terms)');
  section.add('--layout-max-width-text', rem(text), `${text}px: About, Privacy, Terms`);
  const form = get(widths, 'form and waitlist column (Coming soon, Job board waitlist)');
  section.add('--layout-max-width-form', rem(form), `${form}px: form and waitlist column`);
  section.add('--layout-max-width-reading', '70ch', 'about 70 characters per line');

  const results = get(layout, 'results screen desktop');
  section.add('--layout-results-rail', rem(get(results, 'left rail')), `${get(results, 'left rail')}px`);
  section.add('--layout-results-detail', rem(get(results, 'middle detail')), `${get(results, 'middle detail')}px`);
  const [cvMax] = extractNumbers(get(results, 'CV panel'), /maxes at (\d+)/, 'layout > results screen desktop > CV panel');
  section.add('--layout-results-cv-page', rem(cvMax), `${cvMax}px: CV page max width`);

  const [nav] = extractNumbers(get(tokens, 'marketing site', 'frame'), /Nav (\d+) tall/, 'marketing site > frame');
  section.add('--layout-nav-height', rem(nav), `${nav}px: marketing nav`);
}

function buildComponents(tokens, css) {
  const c = get(tokens, 'components');
  const section = css.section(':root', 'COMPONENT SIZES', [
    'Source: "components", "layout > touch targets", "icons", "marketing site".',
    'App buttons 44 tall (36 small, desktop only, top bar and inside cards).',
    'Marketing pages use 48 for buttons and inputs.',
    'On phones every button and tappable icon is at least 44 x 44.',
  ]);
  const size = (name, n, note) => section.add(name, rem(n), note ? `${n}px: ${note}` : `${n}px`);

  size('--size-button', get(c, 'buttons', 'height'));
  size('--size-button-small', get(c, 'buttons', 'small', 'height'), 'desktop only');
  const [mktButton, mktInput] = extractNumbers(
    get(tokens, 'marketing site', 'buttons and inputs'),
    /Buttons (\d+) tall and inputs (\d+) tall/,
    'marketing site > buttons and inputs',
  );
  size('--size-button-marketing', mktButton);
  size('--size-input', get(c, 'inputs', 'height'));
  size('--size-input-marketing', mktInput);
  const [touch] = extractNumbers(get(tokens, 'layout', 'touch targets'), /(\d+) x \d+/, 'layout > touch targets');
  size('--size-touch-target', touch, 'minimum on phones');

  const [icon] = extractNumbers(get(tokens, 'icons', 'size'), /^(\d+)px/, 'icons > size');
  size('--size-icon', icon, 'Lucide default');
  const [stroke] = extractNumbers(get(tokens, 'icons', 'style'), /([\d.]+)px stroke/, 'icons > style');
  section.add('--icon-stroke-width', px(stroke), 'Lucide outline stroke');
}

// -----------------------------------------------------------------------------
// Motion
// -----------------------------------------------------------------------------

function buildMotion(tokens, css, reducedScope) {
  const m = get(tokens, 'motion');
  const d = get(m, 'durations');
  const ms = (key, re) => extractNumbers(get(d, key), re, `motion > durations > ${key}`)[0];

  const durations = [
    ['--duration-fast', ms('small color changes', /^(\d+)ms$/), 'small colour changes'],
    ['--duration-medium', ms('menus, popups, banners', /^(\d+)ms$/), 'menus, popups, banners'],
    ['--duration-score', ms('score count-up', /(\d+)ms/), 'score count-up'],
  ];

  const section = css.section(':root', 'MOTION', [
    'Source: "motion". Fade and slide only. No bouncing, wiggling or pulsing.',
    'Allowed only in: hero scan demo, How It Works reveal (once), score',
    'count-up, CV highlight when a category opens, green check on approve.',
    'Reduced motion sets every duration to 0ms (see the media block below).',
  ]);
  for (const [name, value, note] of durations) section.add(name, `${value}ms`, note);
  const easing = get(m, 'easing');
  if (!/^(ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier\(.+\))$/.test(easing)) {
    throw new TokenError('motion > easing', `"${easing}" is not a CSS timing function.`);
  }
  section.add('--easing-standard', easing);

  const reduced = css.section(reducedScope, 'MOTION: reduced', [
    'Source: "motion > reduced motion". All animation off; final values show',
    'immediately. JS animations must also check',
    'matchMedia("(prefers-reduced-motion: reduce)").',
  ]);
  for (const [name] of durations) reduced.add(name, '0ms');
}

// -----------------------------------------------------------------------------
// Assemble
// -----------------------------------------------------------------------------

function generate(tokens, inputPath, outputPath) {
  const css = new CssBuilder();

  const [phoneBelow] = extractNumbers(
    get(tokens, 'layout', 'breakpoints', 'phone'),
    /^under (\d+)/,
    'layout > breakpoints > phone',
  );
  // Scopes are registered in this order, so this fixes the order in the file:
  // all :root tokens first, then the phone overrides, then reduced motion.
  const ROOT = ':root';
  const PHONE = `@media (width < ${phoneBelow}px)`;
  const REDUCED = '@media (prefers-reduced-motion: reduce)';
  for (const scope of [ROOT, PHONE, REDUCED]) css.declareScope(scope);

  const primitives = buildPrimitives(tokens, css);
  buildRoles(tokens, css, primitives);
  buildGradients(tokens, css, primitives);
  buildTypography(tokens, css, PHONE);
  buildSpacing(tokens, css, PHONE);
  buildShape(tokens, css);
  buildLayout(tokens, css);
  buildComponents(tokens, css);
  buildMotion(tokens, css, REDUCED);

  const rel = (p) => relative(dirname(outputPath), p).replace(/\\/g, '/');
  const header = [
    '/* ==========================================================================',
    ' * GRADEA DESIGN TOKENS',
    ' * AUTO-GENERATED. DO NOT EDIT BY HAND.',
    ` * Source:      ${rel(inputPath)}`,
    ` * Generator:   ${rel(fileURLToPath(import.meta.url))}`,
    ' * Regenerate:  node scripts/build-design-tokens.mjs',
    ' *',
    ' * HOW TO USE',
    ' *   Import once, globally (e.g. in app/layout.tsx: import "@/styles/tokens.css").',
    ' *',
    ' *   COLOUR: use --color-* (roles) only.',
    ' *     --primitive-* are the raw palette that roles are built from. They are',
    ' *     listed first because roles reference them, NOT because components',
    ' *     should use them. `--audit` flags any use outside this file.',
    ' *',
    ' *   Everything else: --font-*, --space-*, --radius-*, --shadow-*, --size-*,',
    ' *   --layout-*, --duration-*, --easing-*.',
    ' *',
    ` *   Responsive: phone overrides live in "@media (width < ${phoneBelow}px)" at the`,
    ' *   bottom, so tokens like --space-card-padding switch automatically.',
    ' * ========================================================================== */',
    '',
  ].join('\n');

  return css.render(header);
}

// -----------------------------------------------------------------------------
// --audit: find values that bypass the tokens
// -----------------------------------------------------------------------------
//
// Flags three kinds of problem, per .claude/rules/design-system-rules.md:
//   1. primitive   any `--primitive-*` use. Components must use --color-* roles.
//   2. raw colour  hex (#abc, #abcd, #aabbcc, #aabbccdd), rgb(), rgba(), hsl(),
//                  hsla(). `currentColor` and `transparent` never match.
//   3. raw px      a non-zero px value on font-size, padding*, margin*, gap,
//                  row-gap, column-gap, border*-radius or box-shadow, in CSS
//                  (`padding: 12px`) or in JS style objects (`fontSize: '12px'`).
//                  `0px` is allowed. Border widths are not checked, so 1px
//                  borders are allowed.
//
// Skipped files:
//   - tokens.css (the generated output) and this generator script.
//   - Generated folders (node_modules, .next, out, dist, build, coverage) and
//     generated files (*.generated.*, *.min.*, next-env.d.ts).
//   - Logo and icon SVGs: any .svg whose path contains "logo" or "icon".
//   - File types not listed in AUDIT_EXTENSIONS (e.g. .md, .json content files).
//
// Known limit: React numeric style values (`padding: 16`, which React treats
// as px) are not flagged, because a bare number is too ambiguous to detect
// reliably in plain JS objects.

const AUDIT_EXTENSIONS = new Set(['.css', '.scss', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.mdx', '.html', '.svg']);
const AUDIT_SKIP_DIRS = /(^|[\\/])(node_modules|\.next|out|dist|build|coverage|\.git)([\\/]|$)/;
const AUDIT_GENERATED_FILES = /(\.generated\.|\.min\.|(^|[\\/])next-env\.d\.ts$)/;
const AUDIT_EXEMPT_SVG = /logo|icon/i;

/** Hex colours. Not preceded by a word char or "&" (HTML entities like &#123;). */
const RAW_HEX = /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
/** Colour functions. */
const RAW_COLOR_FN = /\b(?:rgba?|hsla?)\s*\([^)]*\)?/gi;
/**
 * A spacing/type/shape property followed by its value, in kebab-case (CSS)
 * or camelCase (JS). Group 1 is the property, group 2 the rest of the line.
 * Group 2 is captured inside a lookahead so it does not consume the line,
 * letting several properties on one line each be matched.
 */
const PX_PROPERTY =
  /(?<![\w-])(font-size|fontSize|padding(?:-[a-z]+)*|padding[A-Z]\w*|margin(?:-[a-z]+)*|margin[A-Z]\w*|gap|row-gap|column-gap|rowGap|columnGap|border(?:-[a-z]+)*-radius|border\w*Radius|box-shadow|boxShadow)\s*:\s*(?=(.*))/g;
/** A px number inside a value. Group 1 is the number. */
const PX_VALUE = /(?<![\w.-])(-?\d*\.?\d+)px\b/g;

/**
 * Cut a property's value out of the rest of the line. Quoted JS values end at
 * the closing quote; CSS values end at ";" or "}".
 */
function valueOf(rest) {
  const quote = rest[0];
  if (quote === "'" || quote === '"' || quote === '`') {
    const end = rest.indexOf(quote, 1);
    return end === -1 ? rest.slice(1) : rest.slice(1, end);
  }
  return rest.split(/[;}]/)[0];
}

/** Every finding on one line, as { kind, value }. */
function auditLine(line) {
  const found = [];
  if (line.includes(PRIMITIVE_PREFIX)) {
    for (const m of line.matchAll(/--primitive-[\w-]+/g)) found.push({ kind: 'primitive', value: m[0] });
  }
  for (const m of line.matchAll(RAW_HEX)) found.push({ kind: 'raw colour', value: m[0] });
  for (const m of line.matchAll(RAW_COLOR_FN)) found.push({ kind: 'raw colour', value: m[0] });
  for (const m of line.matchAll(PX_PROPERTY)) {
    for (const px of valueOf(m[2]).matchAll(PX_VALUE)) {
      if (Number(px[1]) !== 0) found.push({ kind: 'raw px', value: `${m[1]}: ${px[0]}` });
    }
  }
  return found;
}

function audit(dir, outputPath) {
  if (!existsSync(dir)) {
    console.error(`Audit directory not found: ${dir}`);
    return 1;
  }
  const self = fileURLToPath(import.meta.url);
  const hits = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = join(entry.parentPath ?? entry.path, entry.name);
    const rel = relative(dir, file);
    if (AUDIT_SKIP_DIRS.test(rel) || AUDIT_GENERATED_FILES.test(rel)) continue;
    const ext = extname(file);
    if (!AUDIT_EXTENSIONS.has(ext)) continue;
    if (ext === '.svg' && AUDIT_EXEMPT_SVG.test(rel)) continue;
    if (resolve(file) === resolve(outputPath) || resolve(file) === resolve(self)) continue;
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        for (const { kind, value } of auditLine(line)) {
          hits.push(`${relative(REPO_DIR, file)}:${i + 1}  ${kind.padEnd(10)}  ${value}`);
        }
      });
  }
  if (hits.length) {
    console.error(
      `Found ${hits.length} value(s) that bypass the design tokens. ` +
        'Use --color-* roles, --space-*, --radius-*, --font-* and --shadow-floating instead:\n',
    );
    for (const h of hits) console.error(`  ${h}`);
    return 1;
  }
  console.log('Audit passed: no primitive colours, raw colours or raw px found.');
  return 0;
}

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, check: false, audit: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.input = resolve(argv[++i] ?? '');
    else if (a === '--output') args.output = resolve(argv[++i] ?? '');
    else if (a === '--check') args.check = true;
    else if (a === '--audit') {
      const next = argv[i + 1];
      args.audit = next && !next.startsWith('--') ? resolve(argv[++i]) : REPO_DIR;
    } else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}. Use --help.`);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      [
        'Usage: node scripts/build-design-tokens.mjs [options]',
        '',
        '  (no options)       Generate the CSS file.',
        '  --check            Exit 1 if the CSS file is missing or out of date.',
        '  --audit [dir]      Exit 1 on --primitive-*, raw colours or raw px outside the CSS file.',
        '  --input <path>     Token JSON (default: gradea-design-tokens.json at repo root).',
        '  --output <path>    CSS file (default: styles/tokens.css).',
      ].join('\n'),
    );
    return 0;
  }

  if (args.audit) return audit(args.audit, args.output);

  let tokens;
  try {
    tokens = JSON.parse(readFileSync(args.input, 'utf8'));
  } catch (err) {
    console.error(`Could not read token JSON at ${args.input}: ${err.message}`);
    return 1;
  }

  const css = generate(tokens, args.input, args.output);

  if (args.check) {
    const current = existsSync(args.output) ? readFileSync(args.output, 'utf8') : null;
    if (current !== css) {
      console.error(
        `${relative(REPO_DIR, args.output)} is ${current === null ? 'missing' : 'out of date'}. ` +
          'Run: node scripts/build-design-tokens.mjs',
      );
      return 1;
    }
    console.log(`${relative(REPO_DIR, args.output)} is up to date.`);
    return 0;
  }

  mkdirSync(dirname(args.output), { recursive: true });
  writeFileSync(args.output, css);
  const count = (css.match(/^\s*--[\w-]+:/gm) ?? []).length;
  console.log(`Wrote ${count} declarations to ${relative(REPO_DIR, args.output)}.`);
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error(err instanceof TokenError ? `Token error ${err.message}` : err);
  process.exitCode = 1;
}
