import type { Metadata } from "next";
import { UploadFlow } from "../../components/scan/UploadFlow";
import { getContent } from "../../lib/content";

// A1 Upload (Build Plan Phase 2): the guest and signed-in upload page, General analysis.
const content = getContent("app/upload");

export const metadata: Metadata = {
  title: content.meta.title,
};

export default function UploadPage() {
  return <UploadFlow />;
}
