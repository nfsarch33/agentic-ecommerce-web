import { fetchProductBySlug } from "@/lib/adapters/api/products";

// The workflow summary the backend serves today carries no product_title
// (and no draft text), so approvals rows would list raw product ids. The
// page joins the product records server-side: one request per UNIQUE
// product id among the waiting drafts, failures skipped (the row falls
// back to the id) — a missing join never breaks the inbox.

export interface ApprovalProductSummary {
  readonly id: string;
  readonly title: string;
  readonly sku?: string;
  /** The pending draft: on this fixture it is the product description
   * the workflow will publish once approved. */
  readonly description?: string;
}

export type ApprovalProducts = Record<string, ApprovalProductSummary>;

export interface LoadApprovalProductsInput {
  readonly baseUrl: string;
  readonly productIds: readonly string[];
  /** Test seam; defaults to the real adapter. */
  readonly fetchImpl?: typeof fetchProductBySlug;
}

export async function loadApprovalProducts(
  input: LoadApprovalProductsInput,
): Promise<ApprovalProducts> {
  const unique = [...new Set(input.productIds.filter((id) => id.trim() !== ""))];
  const results = await Promise.allSettled(
    unique.map((id) =>
      (input.fetchImpl ?? fetchProductBySlug)({
        baseUrl: input.baseUrl,
        slug: id,
      }),
    ),
  );
  const out: ApprovalProducts = {};
  results.forEach((r, i) => {
    if (r.status !== "fulfilled") return; // row falls back to the raw id
    const id = unique[i];
    if (id === undefined) return;
    out[id] = {
      id: r.value.id,
      title: r.value.title,
      sku: r.value.sku,
      description: r.value.description,
    };
  });
  return out;
}
