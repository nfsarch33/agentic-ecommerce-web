import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { privatePageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...privatePageMetadata({
    title: "Admin Sign In | Agentic Ecommerce",
    description: "Sign in to the Agentic Ecommerce admin console.",
    canonical: "/login",
  }),
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-md">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Access the Agentic Ecommerce admin dashboard. Sessions are stored in a secure httpOnly cookie.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
