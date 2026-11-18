import type { Metadata } from "next";

/**
 * The A5 and A6 pages and the Google pages are steps in a flow, not landing pages: they stay
 * out of search results and their links are not followed.
 */
export function flowPageMetadata(title: string, extra: Metadata = {}): Metadata {
  return { title, robots: { index: false, follow: false }, ...extra };
}
