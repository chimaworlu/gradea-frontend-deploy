import type { Metadata } from "next";
import { ViewerTopBar } from "../../../components/app/ViewerTopBar";
import { FormIntro } from "../../../components/auth/FormPieces";
import authStyles from "../../../components/auth/AuthShell.module.css";
import { flowPageMetadata } from "../../../lib/auth/page-meta";
import { getContent } from "../../../lib/content";

// B1 Processing. A placeholder for now: Part 2 builds the screen from its design, polling
// GET /api/scan/:id/status with backoff. The scan id is in the path, never the guest token.
// The top bar is the shared S2 one, so the account menu is already here.
const content = getContent("app/processing");

export const metadata: Metadata = flowPageMetadata(content.meta.title);

export default function ProcessingPage() {
  return (
    <div className={authStyles.page}>
      <ViewerTopBar />
      <main className={authStyles.main}>
        <div className={authStyles.column}>
          <FormIntro heading={content.hero.heading} subline={content.hero.subline} />
        </div>
      </main>
    </div>
  );
}
