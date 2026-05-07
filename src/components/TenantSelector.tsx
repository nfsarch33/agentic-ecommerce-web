"use client";

import type { TenantOption } from "@/lib/domain/tenant";

export interface TenantSelectorProps {
  readonly tenants: readonly TenantOption[];
  readonly activeTenantId: string;
  readonly onTenantChange?: (tenantId: string) => void;
}

export function TenantSelector({ tenants, activeTenantId, onTenantChange }: TenantSelectorProps) {
  const isSingleTenant = tenants.length <= 1;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <label htmlFor="active-tenant" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Active tenant
      </label>
      <select
        id="active-tenant"
        value={activeTenantId}
        disabled={isSingleTenant}
        onChange={(event) => onTenantChange?.(event.target.value)}
        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 disabled:bg-gray-100 disabled:text-gray-700"
      >
        {tenants.map((tenant) => (
          <option key={tenant.tenantId} value={tenant.tenantId}>
            {tenant.displayName}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-500">
        {isSingleTenant ? "Single tenant mode" : "Switching will scope admin data to the selected tenant."}
      </p>
    </div>
  );
}
