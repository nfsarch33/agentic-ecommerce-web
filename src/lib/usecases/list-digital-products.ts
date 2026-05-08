import {
  DigitalProductsApiError,
  type DigitalProductsList,
  type ListDigitalProductsOptions,
  listDigitalProducts as listDigitalProductsAdapter,
} from "@/lib/adapters/api/digital-products";

export interface ListDigitalProductsUsecaseDeps {
  readonly listImpl?: (opts: ListDigitalProductsOptions) => Promise<DigitalProductsList>;
}

export interface ListDigitalProductsUsecaseInput {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly page?: number;
  readonly perPage?: number;
}

export interface ListDigitalProductsUsecaseOutput {
  readonly products: DigitalProductsList["products"];
  readonly total: number;
  readonly error?: string;
}

export async function listDigitalProductsUsecase(
  input: ListDigitalProductsUsecaseInput,
  deps: ListDigitalProductsUsecaseDeps = {},
): Promise<ListDigitalProductsUsecaseOutput> {
  const fn = deps.listImpl ?? listDigitalProductsAdapter;
  try {
    const list = await fn(input);
    return { products: list.products, total: list.total };
  } catch (err) {
    if (err instanceof DigitalProductsApiError) {
      return { products: [], total: 0, error: err.message };
    }
    throw err;
  }
}
