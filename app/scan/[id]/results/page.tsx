import type { Metadata } from "next";
import { ResultsScreen } from "../../../../components/results/ResultsScreen";
import { flowPageMetadata } from "../../../../lib/auth/page-meta";
import { getContent } from "../../../../lib/content";

// B3 Results (Build Plan Phase 2, PRD Section 12.1). A signed-in owner's page, kept out of search.
const content = getContent("app/results");

export const metadata: Metadata = flowPageMetadata(content.meta.title);

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultsScreen scanSessionId={id} />;
}
