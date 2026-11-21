import type { Metadata } from "next";
import { ScanProcessing } from "../../../components/scan/ScanProcessing";
import { flowPageMetadata } from "../../../lib/auth/page-meta";
import { getContent } from "../../../lib/content";

// B1 Processing, with B2 Scan error and D1 Guest session expired (Build Plan Phase 2). The scan
// id is in the path, never the guest token. A signed-in owner's page, kept out of search.
const content = getContent("app/processing");

export const metadata: Metadata = flowPageMetadata(content.meta.title);

export default async function ProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScanProcessing scanSessionId={id} />;
}
