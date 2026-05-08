import { isLicenseUsable } from "@/lib/domain/digital";
import type { DigitalDownload, License } from "@/lib/domain/digital";
import {
  type CustomerDownloadOptions,
  customerLicenseDownload as customerLicenseDownloadAdapter,
} from "@/lib/adapters/api/licenses";

export interface IssueDownloadUsecaseDeps {
  readonly downloadImpl?: (opts: CustomerDownloadOptions) => Promise<DigitalDownload>;
}

export interface IssueDownloadUsecaseInput {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly license: License;
}

export class DownloadDisallowedError extends Error {
  override readonly name = "DownloadDisallowedError";
  constructor(state: License["state"]) {
    super(`Download disallowed for licence in state ${state}`);
  }
}

export async function issueDownloadUsecase(
  input: IssueDownloadUsecaseInput,
  deps: IssueDownloadUsecaseDeps = {},
): Promise<DigitalDownload> {
  if (!isLicenseUsable(input.license.state)) {
    throw new DownloadDisallowedError(input.license.state);
  }
  const fn = deps.downloadImpl ?? customerLicenseDownloadAdapter;
  return fn({
    baseUrl: input.baseUrl,
    tenantId: input.tenantId,
    licenseId: input.license.id,
  });
}
