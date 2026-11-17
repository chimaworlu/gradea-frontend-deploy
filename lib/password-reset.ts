import { PASSWORD_RESET_LINK_LIFETIME_SECONDS } from "./config";
import { fillPlaceholders, getContent } from "./content";

const SECONDS_PER_HOUR = 60 * 60;
const plurals = new Intl.PluralRules("en-GB");

/** The reset link lifetime as A5 shows it, for the {duration} placeholder, for example "1 hour". */
export function resetLinkDuration(
  lifetimeSeconds: number = PASSWORD_RESET_LINK_LIFETIME_SECONDS,
): string {
  const hours = Math.round(lifetimeSeconds / SECONDS_PER_HOUR);
  const wording = getContent("app/forgot-password").linkLifetime;
  const template = plurals.select(hours) === "one" ? wording.one : wording.other;
  return fillPlaceholders(template, { count: hours });
}
