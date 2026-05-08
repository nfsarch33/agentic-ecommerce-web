import type { Metadata } from "next";
import { listMyLicensesUsecase } from "@/lib/usecases/list-my-licenses";
import { DigitalLibraryPanel } from "@/components/DigitalLibraryPanel";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "My Digital Library | Agentic Ecommerce",
    description: "Download digital products you have purchased.",
    canonical: "/account/digital-library",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function DigitalLibraryPage() {
  await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;

  const result = await listMyLicensesUsecase({ baseUrl, tenantId });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">My Digital Library</h1>
      <p className="mt-1 text-sm text-gray-600">
        Your purchased digital products. Tap a download link to fetch the artefact via a
        signed URL that expires in 5 minutes.
      </p>
      <div className="mt-6">
        <DigitalLibraryPanel
          licenses={result.licenses}
          tenantId={tenantId}
          baseUrl={baseUrl}
          error={result.error}
        />
      </div>
    </main>
  );
}
