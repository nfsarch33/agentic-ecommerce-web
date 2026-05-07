import {
  fetchTenantSettings,
  updateTenantSettings,
  type TenantApiOptions,
  type UpdateTenantSettingsOptions,
} from "@/lib/adapters/api/tenant";
import { createTenantSettings, type TenantSettings } from "@/lib/domain/tenant";

export interface LoadTenantSettingsInput {
  readonly baseUrl: string;
}

export interface SaveTenantSettingsInput {
  readonly baseUrl: string;
  readonly settings: TenantSettings;
}

export interface TenantSettingsDeps {
  readonly fetchTenantSettingsImpl?: (opts: TenantApiOptions) => Promise<TenantSettings>;
  readonly updateTenantSettingsImpl?: (opts: UpdateTenantSettingsOptions) => Promise<TenantSettings>;
}

export async function loadTenantSettings(
  input: LoadTenantSettingsInput,
  deps: TenantSettingsDeps = {},
): Promise<TenantSettings> {
  const impl = deps.fetchTenantSettingsImpl ?? fetchTenantSettings;
  return impl({ baseUrl: input.baseUrl });
}

export async function saveTenantSettings(
  input: SaveTenantSettingsInput,
  deps: TenantSettingsDeps = {},
): Promise<TenantSettings> {
  const impl = deps.updateTenantSettingsImpl ?? updateTenantSettings;
  return impl({ baseUrl: input.baseUrl, settings: createTenantSettings(input.settings) });
}
