import { fetchProductBySlug } from "@/lib/adapters/api/products";

// The workflow summary the backend serves today carries no product_title
// (and no draft text), so approvals rows would list raw product ids. The
// page joins the product records server-side: one request per UNIQUE
// product id among the waiting drafts, a bounded pool of JOIN_CONCURRENCY
// in flight (55 waiting drafts must not become 55 parallel GETs on one
// page load), failures skipped (the row falls back to the id) — a
// missing join never breaks the inbox.

// Fan-out cap for the product join. Small on purpose: this fires per
// page load of the approvals inbox; the join is a convenience for the
// approver, not a race.
const JOIN_CONCURRENCY = 6;

export interface ApprovalProductSummary {
  readonly id: string;
  readonly title: string;
  readonly sku?: string;
  /** The CURRENT store record's description (the store record as it is
   * now; the workflow overwrites it only on approval). NOT the draft
   * text — the workflow API does not expose that yet. */
  readonly description?: string;
}

export type ApprovalProducts = Record<string, ApprovalProductSummary>;

export interface LoadApprovalProductsInput {
  readonly baseUrl: string;
  readonly productIds: readonly string[];
  /** Test seam; defaults to the real adapter. */
  readonly fetchImpl?: typeof fetchProductBySlug;
  /** A fetch with the session bearer attached (server components): the
   * backend's product reads are RBAC-authed; rides along to the adapter. */
  readonly fetch?: typeof fetch;
}

export async function loadApprovalProducts(
  input: LoadApprovalProductsInput,
): Promise<ApprovalProducts> {
  const unique = [...new Set(input.productIds.filter((id) => id.trim() !== ""))];
  const out: ApprovalProducts = {};
  let next = 0;
  const fetchOne =
    input.fetchImpl ??
    ((opts: Parameters<typeof fetchProductBySlug>[0]) =>
      fetchProductBySlug({ ...opts, ...(input.fetch ? { fetchImpl: input.fetch } : {}) }));
  const worker = async (): Promise<void> => {
    for (let i = next++; i < unique.length; i = next++) {
      const id = unique[i];
      if (id === undefined) continue;
      try {
        const value = await fetchOne({ baseUrl: input.baseUrl, slug: id });
        out[id] = {
          id: value.id,
          title: value.title,
          sku: value.sku,
          description: value.description,
        };
      } catch {
        // row falls back to the raw id
      }
    }
  };
  const workers = Array.from(
    { length: Math.min(JOIN_CONCURRENCY, unique.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return out;
}
