import type { Metadata } from "next";
import { AuthShell } from "../../../components/auth/AuthShell";
import { FormIntro } from "../../../components/auth/FormPieces";
import { flowPageMetadata } from "../../../lib/auth/page-meta";
import { getContent } from "../../../lib/content";

// B1 Processing. A placeholder for now: Part 2 builds the screen from its design, polling
// GET /api/scan/:id/status with backoff. The scan id is in the path, never the guest token.
const content = getContent("app/processing");

export const metadata: Metadata = flowPageMetadata(content.meta.title);

export default function ProcessingPage() {
  return (
    <AuthShell logoAlt={getContent("app/upload").topBar.logoAlt}>
      <FormIntro heading={content.hero.heading} subline={content.hero.subline} />
    </AuthShell>
  );
}
