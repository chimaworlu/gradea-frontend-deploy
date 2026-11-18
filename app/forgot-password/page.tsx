import { AuthShell } from "../../components/auth/AuthShell";
import { ForgotPasswordFlow } from "../../components/auth/ForgotPasswordFlow";
import { flowPageMetadata } from "../../lib/auth/page-meta";
import { getContent } from "../../lib/content";

// A5 Forgot password: Request and Email sent.
const content = getContent("app/forgot-password");

export const metadata = flowPageMetadata(content.meta.title);

export default function ForgotPasswordPage() {
  return (
    <AuthShell logoAlt={content.header.logoAlt}>
      <ForgotPasswordFlow />
    </AuthShell>
  );
}
