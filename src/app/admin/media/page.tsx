import type { Metadata } from "next";
import { MediaLibrary } from "@/components/MediaLibrary";
import { loadMediaLibrary } from "@/lib/usecases/media-library";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media Library | Agentic Ecommerce Admin",
  description: "Source product media, edit metadata, and review media QA status.",
  alternates: {
    canonical: "/admin/media",
  },
};

export default async function MediaAdminPage() {
  const serverBaseUrl = process.env.MC_API_BASE_URL ?? "http://localhost:8080";
  const clientBaseUrl = process.env.NEXT_PUBLIC_MC_API_BASE_URL ?? serverBaseUrl;
  const { assets } = await loadMediaLibrary({ baseUrl: serverBaseUrl });

  return <MediaLibrary assets={assets} apiBaseUrl={clientBaseUrl} />;
}
