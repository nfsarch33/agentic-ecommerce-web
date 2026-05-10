import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Onboarding wizard | Agentic Ecommerce",
    description:
      "v3.9.1 Existing #10 -- AI-driven 4-step onboarding wizard (identity, channels, compliance, initial product seeding) backed by the v3.0.0 tenant_onboarding Temporal workflow.",
    canonical: "/onboarding",
  }),
};

export default function OnboardingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-950">AI Onboarding Wizard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Existing roadmap #10 -- replaces the static{" "}
          <code>/register/onboarding</code> page with a 4-step wizard. Step 1 captures tenant
          identity, step 2 selects channels, step 3 configures compliance (auto-detected
          per country), and step 4 seeds the initial product catalogue. Step 5 finalises
          the tenant via the existing Temporal workflow.
        </p>
      </header>
      <OnboardingWizard />
    </main>
  );
}
