import { Suspense } from "react";
import type { Metadata } from "next";
import { OnboardingClient } from "@/components/OnboardingClient";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: "Onboarding | Agentic Ecommerce",
    description: "Complete tenant onboarding to provision your workspace.",
    canonical: "/register/onboarding",
  }),
};

export default function OnboardingPage() {
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  return (
    <main className="mx-auto max-w-xl px-6 py-12 space-y-6" data-testid="register-onboarding-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
        <p className="text-sm text-slate-600">
          Tell us your company name and confirm a plan to provision the tenant.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-slate-600">Loading…</p>}>
        <OnboardingClient baseUrl={baseUrl} />
      </Suspense>
    </main>
  );
}
