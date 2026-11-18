import { AuthShell } from "../../components/auth/AuthShell";
import { LinkGoogleFlow } from "../../components/auth/LinkGoogleFlow";
import { flowPageMetadata } from "../../lib/auth/page-meta";
import { getContent } from "../../lib/content";

// A6 Account link confirm. The API sends the browser here after Google when the Google email
// already has a password account (GOOGLE_FRONTEND_PATHS.confirmLink).
const content = getContent("app/account-link");

export const metadata = flowPageMetadata(content.meta.title);

export default function LinkGooglePage() {
  return (
    <AuthShell logoAlt={content.header.logoAlt}>
      <LinkGoogleFlow />
    </AuthShell>
  );
}
