import type { Metadata } from "next";
import { AuthShell } from "../../components/auth/AuthShell";
import { SignupForm } from "../../components/auth/SignupForm";
import { getContent } from "../../lib/content";

// A4 Sign up: the direct door for people who sign up without uploading a CV first (FR-23, FR-31).
const content = getContent("app/auth");

export const metadata: Metadata = {
  title: content.signUp.meta.title,
};

export default function SignupPage() {
  return (
    <AuthShell logoAlt={content.header.logoAlt}>
      <SignupForm />
    </AuthShell>
  );
}
