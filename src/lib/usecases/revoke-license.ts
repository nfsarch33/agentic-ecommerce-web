import { canRevoke, IllegalLicenseTransitionError } from "@/lib/domain/digital";
import type { License } from "@/lib/domain/digital";
import {
  type RevokeLicenseOptions,
  revokeLicense as revokeLicenseAdapter,
} from "@/lib/adapters/api/licenses";

export interface RevokeLicenseUsecaseDeps {
  readonly revokeImpl?: (opts: RevokeLicenseOptions) => Promise<License>;
}

export interface RevokeLicenseUsecaseInput {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly license: License;
}

// revokeLicenseUsecase enforces the client-side state-machine guard
// before issuing the network call. This mirrors the v2.2.0 membership
// usecase pattern so illegal transitions get a typed error before
// they hit the wire.
export async function revokeLicenseUsecase(
  input: RevokeLicenseUsecaseInput,
  deps: RevokeLicenseUsecaseDeps = {},
): Promise<License> {
  if (!canRevoke(input.license.state)) {
    throw new IllegalLicenseTransitionError(input.license.state, "revoke");
  }
  const fn = deps.revokeImpl ?? revokeLicenseAdapter;
  return fn({
    baseUrl: input.baseUrl,
    tenantId: input.tenantId,
    id: input.license.id,
  });
}
