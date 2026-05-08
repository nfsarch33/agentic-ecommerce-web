import type { Metadata } from "next";
import { RegistrationForm } from "@/components/RegistrationForm";
import { publicPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: "Register your tenant | Agentic Ecommerce",
    description: "Create a tenant on Agentic Ecommerce. Email + slug, verify, and pick a plan.",
    canonical: "/register",
  }),
};

export default function RegisterPage() {
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  return (
    <main className="mx-auto max-w-xl px-6 py-12 space-y-6" data-testid="register-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your tenant</h1>
        <p className="text-sm text-slate-600">
          Sign up with your email and pick a slug. We will email a verification
          link to confirm the address.
        </p>
      </header>
      <RegistrationForm baseUrl={baseUrl} />
    </main>
  );
}
