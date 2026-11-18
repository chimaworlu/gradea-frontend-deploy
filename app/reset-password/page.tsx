import { AuthShell } from "../../components/auth/AuthShell";
import { ResetPasswordFlow } from "../../components/auth/ResetPasswordFlow";
import { flowPageMetadata } from "../../lib/auth/page-meta";
import { getContent } from "../../lib/content";

// A5 New password, Success and Link expired. Opened from the reset email with ?token=. The
// token is read in the browser and taken out of the address bar at once. No referrer is sent
// from this page, so the token can never leak to another site (next.config.ts also sends the
// Referrer-Policy header).
const content = getContent("app/forgot-password");

export const metadata = flowPageMetadata(content.meta.title, { referrer: "no-referrer" });

export default function ResetPasswordPage() {
  return (
    <AuthShell logoAlt={content.header.logoAlt}>
      <ResetPasswordFlow />
    </AuthShell>
  );
}
