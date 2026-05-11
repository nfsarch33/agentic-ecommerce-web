"use client";

import { useState } from "react";
import {
  ALLOWED_COMPLIANCE,
  type WizardCompliance,
  type WizardIdentity,
} from "@/lib/domain/onboarding-wizard";

export interface ComplianceStepProps {
  readonly initial?: WizardCompliance;
  readonly identity?: WizardIdentity;
  readonly onSubmit: (c: WizardCompliance) => Promise<void> | void;
  readonly disabled?: boolean;
}

// detectDefaults auto-detects the regulation flags relevant for the
// captured identity. AU country -> AU consumer + privacy + tax.
// CN country -> CN ecommerce + data export. Operators can opt in to
// GDPR explicitly.
function detectDefaults(identity?: WizardIdentity): readonly string[] {
  if (!identity) return [];
  const country = identity.country.trim().toUpperCase();
  if (country === "AU") {
    return ["au_consumer_law", "au_privacy_act", "au_australian_tax"];
  }
  if (country === "CN") {
    return ["cn_ecommerce_law", "cn_data_export"];
  }
  return [];
}

export function ComplianceStep({
  initial,
  identity,
  onSubmit,
  disabled,
}: ComplianceStepProps) {
  const [selected, setSelected] = useState<readonly string[]>(
    initial?.compliance ?? detectDefaults(identity),
  );

  function toggle(flag: string): void {
    setSelected((prev) =>
      prev.includes(flag) ? prev.filter((c) => c !== flag) : [...prev, flag],
    );
  }

  return (
    <form
      data-testid="onboarding-step-compliance"
      className="space-y-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.length === 0) return;
        void onSubmit({ compliance: selected });
      }}
    >
      <h2 className="text-base font-semibold text-gray-900">Step 3 of 4 -- Compliance</h2>
      <p className="text-xs text-gray-500">
        Auto-detected from country: <code>{identity?.country ?? "(unknown)"}</code>. Adjust if
        operating across multiple jurisdictions.
      </p>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-slate-700">Compliance flags</legend>
        {ALLOWED_COMPLIANCE.map((flag) => (
          <label key={flag} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(flag)}
              onChange={() => toggle(flag)}
              data-testid={`onboarding-compliance-${flag}`}
              className="rounded border-slate-300"
            />
            <span className="text-slate-700">{flag}</span>
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        disabled={disabled || selected.length === 0}
        data-testid="onboarding-compliance-submit"
        className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Save compliance and continue
      </button>
    </form>
  );
}
