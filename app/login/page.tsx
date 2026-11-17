import type { Metadata } from "next";
import { AuthShell } from "../../components/auth/AuthShell";
import { LoginForm } from "../../components/auth/LoginForm";
import { queryErrorWording } from "../../lib/auth/forms";
import { getContent } from "../../lib/content";

// A4 Log in. The API sends the browser here with ?error=google_failed or google_cancelled when a
// Google sign-in does not finish (GOOGLE_FRONTEND_PATHS in lib/api/shared.ts).
const content = getContent("app/auth");

export const metadata: Metadata = {
  title: content.logIn.meta.title,
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  return (
    <AuthShell logoAlt={content.header.logoAlt}>
      <LoginForm queryError={queryErrorWording(error)} />
    </AuthShell>
  );
}
