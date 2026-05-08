import {
  LicensesApiError,
  type ListLicensesOptions,
  type LicensesList,
  listMyLicenses as listMyLicensesAdapter,
} from "@/lib/adapters/api/licenses";

export interface ListMyLicensesUsecaseDeps {
  readonly listImpl?: (opts: ListLicensesOptions) => Promise<LicensesList>;
}

export interface ListMyLicensesUsecaseInput {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly page?: number;
  readonly perPage?: number;
}

export interface ListMyLicensesUsecaseOutput {
  readonly licenses: LicensesList["licenses"];
  readonly total: number;
  readonly error?: string;
}

export async function listMyLicensesUsecase(
  input: ListMyLicensesUsecaseInput,
  deps: ListMyLicensesUsecaseDeps = {},
): Promise<ListMyLicensesUsecaseOutput> {
  const fn = deps.listImpl ?? listMyLicensesAdapter;
  try {
    const list = await fn(input);
    return { licenses: list.licenses, total: list.total };
  } catch (err) {
    if (err instanceof LicensesApiError) {
      return { licenses: [], total: 0, error: err.message };
    }
    throw err;
  }
}
