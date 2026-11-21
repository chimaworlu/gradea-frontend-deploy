import type { Metadata } from "next";
import { ViewerTopBar } from "../../../../components/app/ViewerTopBar";
import { FormIntro } from "../../../../components/auth/FormPieces";
import authStyles from "../../../../components/auth/AuthShell.module.css";
import { flowPageMetadata } from "../../../../lib/auth/page-meta";
import { getContent } from "../../../../lib/content";

// B3 Results. A placeholder for now: Part 3 builds the results screen from its design, reading
// GET /api/scan/:id/result. The top bar is the shared S2 one.
const content = getContent("app/results");

export const metadata: Metadata = flowPageMetadata(content.meta.title);

export default function ResultsPage() {
  return (
    <div className={authStyles.page}>
      <ViewerTopBar />
      <main className={authStyles.main}>
        <div className={authStyles.column}>
          <FormIntro heading={content.placeholder.heading} subline={content.placeholder.subline} />
        </div>
      </main>
    </div>
  );
}
