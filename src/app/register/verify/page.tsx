import { Suspense } from "react";
import type { Metadata } from "next";
import { RegistrationVerifyClient } from "@/components/RegistrationVerifyClient";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: "Verify email | Agentic Ecommerce",
    description: "Confirm your tenant email address.",
    canonical: "/register/verify",
  }),
};

export default function RegisterVerifyPage() {
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  return (
    <main className="mx-auto max-w-xl px-6 py-12 space-y-6" data-testid="register-verify-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
        <p className="text-sm text-slate-600">
          Hold on while we confirm your verification token.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-slate-600">Verifying…</p>}>
        <RegistrationVerifyClient baseUrl={baseUrl} />
      </Suspense>
    </main>
  );
}
