---
name: build-marketing-page
description: Use when building a public marketing page in gradea-frontend - homepage, General Analysis, Smart Target, Pricing, Privacy, Terms, Contact, About, 404, affiliate landing, Job board waitlist, coming-soon. Trigger words - marketing, landing page, SEO, metadata, sitemap, share image, structured data, FAQ, pricing page.
---

# Build a marketing page

Builds a public page and makes it findable. Laws: `design-system-rules.md`, `content-and-copy.md`, `analytics.md`. Search steps: PRD Sections 24 and 27.

## Steps
1. Confirm the PNGs in `docs/design/` and the dev notes in `docs/screens/Marketing-site-dev-notes.md`. If any is missing, stop and ask.
2. Create the content file in `content/marketing/`, using the structure from `content-and-copy.md`. Privacy and Terms stay as plain text or Markdown.
3. Reuse the shared nav and footer (S1) and the shared upload box component (PRD Section 24). Do not rebuild them.
4. Build the sections in design order, with tokens only. The content column is 1120 wide.
5. Render on the server as full HTML. Use one H1 per page.
6. Set the page title and description from the content file. Marketing titles also include "resume" so US visitors find the page (`content-and-copy.md`).
7. Set the share image. Add the page to the sitemap. Keep it indexable.
8. Add structured data (Organization, SoftwareApplication, and FAQ where the page has a FAQ). Build the FAQ data from the same content items as the page.
9. Prices, counters and "spots left" come from the server. Show an offer or counter only when it is true.
10. The how-to video is a click-to-play poster. The embed loads only after the visitor taps play.
11. Add the analytics events (page view, key clicks, form submits) through the shared list.
12. Run the audit, then check the page at desktop and phone width.

## Skeleton
```tsx
export const metadata = {
  title: t.meta.title,
  description: t.meta.description,
  openGraph: { images: [t.meta.shareImage] },
};

const faqJsonLd = {
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: t.faq.items.map((q) => ({
    "@type": "Question", name: q.question,
    acceptedAnswer: { "@type": "Answer", text: q.answer },
  })),
};
```

## Traps
- Invented numbers, testimonials or user counts.
- Fake urgency, or a "spots left" count typed into the page.
- Two H1s, or a page that renders only in the browser.
- FAQ data that differs from the FAQ on the page.
- Autoplaying video.
- Social icons in the nav. They belong in the footer.
- An admin or account page that is indexable, or a marketing page marked noindex.

## Verify before done
- [ ] The page has one H1, a title, a description and a share image.
- [ ] It is in the sitemap and renders as server HTML.
- [ ] Structured data matches the visible text.
- [ ] No raw values, no hardcoded text.
- [ ] Tests: the HTML response contains one H1 and the metadata; the structured data parses and matches the FAQ content; the sitemap lists the page; with the offer ended the offer text is absent; the video does not load before a click.