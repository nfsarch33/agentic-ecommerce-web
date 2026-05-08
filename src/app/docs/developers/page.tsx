import type { Metadata } from "next";
import {
  DEFAULT_DEVELOPER_DOC_SECTIONS,
  DeveloperDocsLayout,
} from "@/components/DeveloperDocsLayout";
import { adminPageMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = {
  ...adminPageMetadata({
    title: "Developer docs | Agentic Ecommerce",
    description: "Build a plugin for the Agentic Ecommerce marketplace: manifest contract, SDK, submission flow, and event reference.",
    canonical: "/docs/developers",
  }),
};

export default function DeveloperDocsPage() {
  return (
    <DeveloperDocsLayout sections={DEFAULT_DEVELOPER_DOC_SECTIONS}>
      <h2 id="manifest">Plugin manifest contract</h2>
      <p>
        Each plugin ships a manifest with a slug, semver version, vendor, and the
        events the plugin subscribes to. The manifest is validated by{" "}
        <code>internal/marketplace.Manifest.Validate</code> server side; bad
        manifests are rejected with <code>422 invalid_manifest</code>.
      </p>
      <h2 id="sdk">Plugin SDK &amp; local sandbox</h2>
      <p>
        Pull the example plugin under <code>examples/marketplace-plugin/</code>{" "}
        and run it through the in-process sandbox harness. Sandbox limits enforce
        per-tenant call budgets and outbound rate caps without requiring a tenant
        deployment.
      </p>
      <h2 id="submission">Submission review flow</h2>
      <p>
        POST <code>/api/v1/marketplace/plugins/submit</code> with the manifest
        body. The submission lands in <code>pending_review</code> state. Track
        progress at <code>/admin/marketplace/submissions</code>; the review queue
        shows the same row, and an approval transitions the manifest into the
        global catalogue.
      </p>
      <h2 id="events">Event subscription reference</h2>
      <p>
        Subscribe to canonical events such as <code>order.placed</code>,{" "}
        <code>membership.created</code>, and <code>license.activated</code> in
        the manifest. Unknown events fail validation with{" "}
        <code>422 unknown_event</code>.
      </p>
      <h2 id="rate-limits">Sandbox limits &amp; quotas</h2>
      <p>
        The sandbox enforces a per-plugin per-tenant budget for outbound HTTP
        calls and event-handler invocations. Exceeding the budget returns{" "}
        <code>429 sandbox_budget_exceeded</code>. Escalate via the tenant
        admin to lift the quota.
      </p>
      <h2 id="openapi">OpenAPI spec</h2>
      <p>
        The authoritative contract for marketplace endpoints lives in{" "}
        <code>api/openapi.yaml</code>. Frontend types are regenerated from this
        spec; vendor SDKs may follow the same path.
      </p>
    </DeveloperDocsLayout>
  );
}
