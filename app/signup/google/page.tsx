import { AuthShell } from "../../../components/auth/AuthShell";
import { GoogleSignupFlow } from "../../../components/auth/GoogleSignupFlow";
import { flowPageMetadata } from "../../../lib/auth/page-meta";
import { getContent } from "../../../lib/content";

// Finish sign-up after Google: career level and consent (GOOGLE_FRONTEND_PATHS.finishSignup).
const content = getContent("app/google-signup");

export const metadata = flowPageMetadata(content.meta.title);

export default function GoogleSignupPage() {
  return (
    <AuthShell logoAlt={content.header.logoAlt}>
      <GoogleSignupFlow />
    </AuthShell>
  );
}
