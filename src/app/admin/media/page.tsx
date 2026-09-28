import type { Metadata } from "next";
import { MediaLibrary } from "@/components/MediaLibrary";
import { loadMediaLibrary } from "@/lib/usecases/media-library";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Media Library | Agentic Ecommerce Admin",
    description: "Source product media, edit metadata, and review media QA status.",
    canonical: "/admin/media",
  }),
};

export default async function MediaAdminPage() {
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  // Load inside try/catch, render AFTER: JSX constructed inside a
  // try/catch block is not actually guarded by it (the component only
  // renders later), so the failure path is data, not a second tree.
  const loaded = await loadMediaLibrary({ baseUrl: serverBaseUrl }).then(
    (result) => ({ assets: result.assets, error: null as string | null }),
    (err: unknown) => ({
      assets: [],
      error: err instanceof Error ? err.message : "Unable to load media library.",
    }),
  );
  return (
    <MediaLibrary
      assets={loaded.assets}
      apiBaseUrl={clientBaseUrl}
      initialError={loaded.error ?? undefined}
    />
  );
}
