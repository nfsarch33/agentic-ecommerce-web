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
  // Load inside try/catch, render AFTER it: JSX built inside the try is not
  // guarded by it (the component renders later), so the failure path is
  // data, not a second tree.
  let assets: Awaited<ReturnType<typeof loadMediaLibrary>>["assets"] = [];
  let error: string | undefined;
  try {
    ({ assets } = await loadMediaLibrary({ baseUrl: serverBaseUrl }));
  } catch (err) {
    error = err instanceof Error ? err.message : "Unable to load media library.";
  }
  return (
    <MediaLibrary
      assets={assets}
      apiBaseUrl={clientBaseUrl}
      initialError={error}
    />
  );
}
