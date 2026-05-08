import type { Metadata } from "next";
import { listLicenses, LicensesApiError } from "@/lib/adapters/api/licenses";
import { LicenseManagement } from "@/components/LicenseManagement";
import { requireServerSession } from "@/lib/server/auth-session";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Licences | Agentic Ecommerce Admin",
    description: "Review and revoke digital licences across all customers.",
    canonical: "/admin/licenses",
  }),
};

const DEFAULT_TENANT_ID = "tenant_default";

export default async function LicensesAdminPage() {
  const session = await requireServerSession();
  const baseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? DEFAULT_TENANT_ID;

  let licenses: Awaited<ReturnType<typeof listLicenses>> = {
    licenses: [],
    total: 0,
    page: 1,
    perPage: 20,
  };
  let error: string | undefined;
  try {
    licenses = await listLicenses({ baseUrl, tenantId });
  } catch (err) {
    error = err instanceof LicensesApiError ? err.message : "list_failed";
  }

  return (
    <LicenseManagement
      initialLicenses={licenses.licenses}
      userRole={session.user.role}
      tenantId={tenantId}
      baseUrl={baseUrl}
      error={error}
    />
  );
}
