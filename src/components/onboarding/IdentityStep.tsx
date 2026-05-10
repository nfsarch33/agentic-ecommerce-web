"use client";

import { useState } from "react";
import {
  ALLOWED_BUSINESS_TYPES,
  type WizardIdentity,
} from "@/lib/domain/onboarding-wizard";

export interface IdentityStepProps {
  readonly initial?: WizardIdentity;
  readonly onSubmit: (id: WizardIdentity) => Promise<void> | void;
  readonly disabled?: boolean;
}

export function IdentityStep({ initial, onSubmit, disabled }: IdentityStepProps) {
  const [tenantName, setTenantName] = useState(initial?.tenantName ?? "");
  const [ownerEmail, setOwnerEmail] = useState(initial?.ownerEmail ?? "");
  const [country, setCountry] = useState(initial?.country ?? "AU");
  const [businessType, setBusinessType] = useState<string>(initial?.businessType ?? "company");

  function isValid(): boolean {
    return (
      tenantName.trim().length > 0 &&
      ownerEmail.trim().length > 0 &&
      country.trim().length > 0 &&
      ALLOWED_BUSINESS_TYPES.includes(businessType as (typeof ALLOWED_BUSINESS_TYPES)[number])
    );
  }

  return (
    <form
      data-testid="onboarding-step-identity"
      className="space-y-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValid()) return;
        void onSubmit({ tenantName, ownerEmail, country, businessType });
      }}
    >
      <h2 className="text-base font-semibold text-gray-900">Step 1 of 4 -- Tenant identity</h2>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Tenant name</span>
        <input
          type="text"
          value={tenantName}
          onChange={(e) => setTenantName(e.target.value)}
          data-testid="onboarding-identity-name"
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Owner email</span>
        <input
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          data-testid="onboarding-identity-email"
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Country (ISO-2)</span>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
          data-testid="onboarding-identity-country"
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
          maxLength={3}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Business type</span>
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          data-testid="onboarding-identity-business-type"
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        >
          {ALLOWED_BUSINESS_TYPES.map((bt) => (
            <option key={bt} value={bt}>
              {bt}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={disabled || !isValid()}
        data-testid="onboarding-identity-submit"
        className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Save identity and continue
      </button>
    </form>
  );
}
