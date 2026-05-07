import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers/auth";

const orderId = "318f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c";
const productId = "018f1c8e-3b58-7c0a-a3a1-1f2d8e0a2b3c";
const mockApiBaseUrl = `http://127.0.0.1:${process.env.E2E_MOCK_API_PORT ?? "18080"}`;

test.skip(process.env.E2E_RELEASE_FLOW !== "true", "run with make release-e2e");
test.setTimeout(120_000);

test("v2.0.0 release flow covers storefront, Temporal, MIS, mocked WooCommerce, and n8n", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /resistance band set/i })).toBeVisible();

  await page
    .getByRole("button", { name: /add to cart/i })
    .first()
    .click();
  await page.getByRole("link", { name: /view cart/i }).click();
  await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  await page.getByRole("link", { name: /checkout/i }).click();

  await page.getByLabel(/email/i).fill("shopper@example.com");
  await page.getByLabel(/full name/i).fill("Jane Shopper");
  await page.getByLabel(/address line 1/i).fill("1 Market Street");
  await page.getByLabel(/city/i).fill("Sydney");
  await page.getByLabel(/state or region/i).fill("NSW");
  await page.getByLabel(/postal code/i).fill("2000");
  await Promise.all([
    page.waitForURL(new RegExp(`/orders/${orderId}$`), { timeout: 20_000 }),
    page.getByRole("button", { name: /place order/i }).click(),
  ]);
  await expect(page.getByRole("heading", { name: /order confirmed/i })).toBeVisible();
  await expect(page.getByText("shopper@example.com")).toBeVisible();

  await signInAs(page, "admin");
  await page.goto(`/admin/orders?id=${orderId}`);
  await expect(page.getByRole("heading", { name: "Order Management" })).toBeVisible();
  await expect(page.getByText("shopper@example.com")).toBeVisible();
  await expect(page.getByText("Resistance Band Set")).toBeVisible();

  await page.goto("/admin/settings/webhooks");
  const localWebhookUrl = `${mockApiBaseUrl}/mock-n8n/product-approved`;
  await page.getByLabel(/destination url/i).fill(localWebhookUrl);
  await page.getByLabel(/signing secret/i).fill("release-local-secret");
  await page.getByLabel(/product approved/i).check();
  await page.getByRole("button", { name: /register webhook/i }).click();
  await expect(page.getByRole("status")).toContainText("Webhook registered.");

  const contentWorkflow = await page.request.post(
    `${mockApiBaseUrl}/api/v1/workflows/content-generation`,
    {
      data: {
        product_id: productId,
        requested_by: "release-e2e",
        style: "professional",
        max_words: 120,
        keywords: ["resistance band set", "home workouts"],
      },
    },
  );
  expect(contentWorkflow.status()).toBe(202);
  const contentWorkflowBody = (await contentWorkflow.json()) as {
    status: string;
    activities: string[];
  };
  expect(contentWorkflowBody.status).toBe("completed");
  expect(contentWorkflowBody.activities).toEqual(
    expect.arrayContaining([
      "content_generation.generate",
      "content_generation.fact_check",
      "content_generation.evaluate",
    ]),
  );

  const mediaWorkflow = await page.request.post(
    `${mockApiBaseUrl}/api/v1/workflows/media-processing`,
    {
      data: {
        product_id: productId,
        source_url: `${mockApiBaseUrl}/fixtures/resistance-band.png`,
        alt_text: "Resistance band set with five tension levels",
        format: "webp",
      },
    },
  );
  expect(mediaWorkflow.status()).toBe(202);
  const mediaWorkflowBody = (await mediaWorkflow.json()) as {
    status: string;
    activities: string[];
  };
  expect(mediaWorkflowBody.status).toBe("completed");
  expect(mediaWorkflowBody.activities).toContain("media_processing.link_product");

  await page.goto(`/admin/products/${productId}/content`);
  await expect(page.getByRole("heading", { name: "AI Description Studio" })).toBeVisible();
  await page.getByRole("button", { name: /generate description/i }).click();
  await expect(page.getByText("Fresh AI copy focused on ecommerce conversion")).toBeVisible();
  await page.getByRole("button", { name: /approve suggestion/i }).click();
  await expect(page.getByRole("status")).toContainText("Suggestion approved");
  await page.getByRole("button", { name: /start publish workflow/i }).click();
  await expect(page.getByRole("status")).toContainText("Publish workflow started.");
  await Promise.all([
    page.waitForURL(/\/admin\/workflows\/wf_product_publish_/),
    page.getByRole("link", { name: /view workflow/i }).click(),
  ]);

  await expect(page.getByRole("heading", { name: /resistance band set workflow/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check compliance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Validate media" })).toBeVisible();
  await expect(page.getByText("MIS media validation passed.")).toBeVisible();
  await expect(page.getByText("Waiting for operator approval.")).toBeVisible();
  await page.getByLabel(/review note/i).fill("Approved in v2 release E2E");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status")).toContainText("Sent approve signal.");

  await page.reload();
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Published to mocked WooCommerce.")).toBeVisible();

  await page.goto("/admin/compliance");
  await expect(page.getByRole("heading", { name: "Compliance Dashboard" })).toBeVisible();
  await expect(page.getByRole("row", { name: /resistance band set/i })).toContainText("Pass");
  await expect(page.getByRole("row", { name: /resistance band set/i })).toContainText("96/100");

  await page.goto("/admin/media");
  await expect(page.getByRole("heading", { name: "Media Library" })).toBeVisible();
  await expect(page.getByText("Resistance band hero image")).toBeVisible();
  await expect(page.getByText("QA passed")).toBeVisible();

  const deliveries = await page.request.get(`${mockApiBaseUrl}/__mock/n8n/deliveries`);
  expect(deliveries.status()).toBe(200);
  const deliveryBody = (await deliveries.json()) as {
    deliveries: Array<{ event_type: string; status: string; target_url: string }>;
  };
  expect(deliveryBody.deliveries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event_type: "product.approved",
        status: "delivered",
        target_url: localWebhookUrl,
      }),
    ]),
  );
});
