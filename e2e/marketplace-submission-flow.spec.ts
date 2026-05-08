import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

test("vendor submits and admin approves a marketplace plugin submission", async ({ page }) => {
  await signInAs(page, "admin");

  // Step 1: vendor-side submit through a direct API call (the vendor
  // surface itself is part of v2.9.0; v2.7.0 ships the queue + admin
  // review surface and the BFF). The mock seeds an existing pending
  // submission so the queue is non-empty, but we POST one more to
  // exercise the create path end-to-end.
  const createResponse = await page.request.post("http://127.0.0.1:18080/api/v1/marketplace/plugins/submit", {
    headers: { "x-tenant-id": "tenant_default", "content-type": "application/json" },
    data: {
      submitter_email: "vendor-e2e@example.com",
      slug: "datadog-metrics",
      name: "Datadog Metrics",
      version: "1.0.0",
      vendor: "Datadog",
      category: "observability",
      event_subscriptions: [],
      permissions: [],
      dependencies: [],
    },
  });
  expect(createResponse.ok()).toBe(true);
  const created = await createResponse.json();

  // Step 2: admin browses /admin/marketplace/submissions and sees the row.
  await page.goto("/admin/marketplace/submissions");
  await expect(page.getByRole("heading", { name: /marketplace plugin submissions/i })).toBeVisible();
  await expect(page.getByTestId(`submission-row-${created.id}`)).toBeVisible();

  // Step 3: admin opens the detail view.
  await page.getByTestId(`submission-row-link-${created.id}`).click();
  await expect(page).toHaveURL(new RegExp(`/admin/marketplace/submissions/${created.id}$`));
  await expect(page.getByText(/datadog metrics/i)).toBeVisible();
  await expect(page.getByTestId("submission-detail")).toBeVisible();
  await expect(page.getByTestId("submission-status-pill")).toHaveAttribute("data-state", "pending_review");

  // Step 4: admin approves with review notes.
  await page.getByTestId("review-notes").fill("looks good, ship it");
  await page.getByTestId("approve-button").click();
  await expect(page.getByTestId("review-success")).toBeVisible();
});

test("admin rejects a pending submission", async ({ page }) => {
  await signInAs(page, "admin");
  const createResponse = await page.request.post("http://127.0.0.1:18080/api/v1/marketplace/plugins/submit", {
    headers: { "x-tenant-id": "tenant_default", "content-type": "application/json" },
    data: {
      submitter_email: "spammer@example.com",
      slug: "spam-plugin",
      name: "Spam Plugin",
      version: "0.0.1",
      vendor: "Spammer",
      event_subscriptions: [],
      permissions: [],
      dependencies: [],
    },
  });
  const created = await createResponse.json();

  await page.goto(`/admin/marketplace/submissions/${created.id}`);
  await page.getByTestId("review-notes").fill("missing license");
  await page.getByTestId("reject-button").click();
  await expect(page.getByTestId("review-success")).toBeVisible();
});

test("developer docs page renders core sections", async ({ page }) => {
  await page.goto("/docs/developers");
  await expect(page.getByTestId("developer-docs-layout")).toBeVisible();
  await expect(page.getByText(/build for the agentic ecommerce marketplace/i)).toBeVisible();
  await expect(page.getByTestId("developer-docs-section-manifest")).toBeVisible();
  await expect(page.getByTestId("developer-docs-section-submission")).toBeVisible();
  await expect(page.getByTestId("developer-docs-section-openapi")).toBeVisible();
});
