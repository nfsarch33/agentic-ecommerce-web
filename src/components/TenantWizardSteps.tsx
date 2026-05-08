"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidTenantSlug } from "@/lib/domain/tenant";
import { provisionTenantUsecase } from "@/lib/usecases/provision-tenant";

export interface TenantWizardStepsProps {
  readonly baseUrl: string;
}

type Step = "details" | "preview" | "submit";

export function TenantWizardSteps({ baseUrl }: TenantWizardStepsProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugIsValid = isValidTenantSlug(slug);
  const formIsValid = slugIsValid && name.trim().length > 0;

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    const result = await provisionTenantUsecase({ baseUrl, slug, name, plan });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      // Stay on preview so the operator can correct the input.
      setStep("preview");
      return;
    }
    router.push(`/admin/tenants/${result.tenant.id}`);
  }

  return (
    <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm" data-testid="tenant-wizard">
      <ol className="flex items-center gap-2 text-sm">
        <li className={step === "details" ? "font-semibold text-slate-900" : "text-slate-500"} data-testid="step-details">
          1. Details
        </li>
        <li className="text-slate-300">→</li>
        <li className={step === "preview" ? "font-semibold text-slate-900" : "text-slate-500"} data-testid="step-preview">
          2. Preview
        </li>
        <li className="text-slate-300">→</li>
        <li className={step === "submit" ? "font-semibold text-slate-900" : "text-slate-500"} data-testid="step-submit">
          3. Provision
        </li>
      </ol>
      {step === "details" ? (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Slug</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              data-testid="tenant-wizard-slug"
              placeholder="acme-corp"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
            />
            {!slugIsValid && slug !== "" ? (
              <span className="mt-1 block text-xs text-rose-700" data-testid="tenant-wizard-slug-error">
                Slug must be kebab-case (lowercase letters, digits, hyphens; min 2 chars).
              </span>
            ) : null}
            {slugIsValid ? (
              <span className="mt-1 block text-xs text-emerald-700" data-testid="tenant-wizard-slug-ok">
                Slug looks good.
              </span>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Display name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="tenant-wizard-name"
              placeholder="Acme Corp"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Plan</span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              data-testid="tenant-wizard-plan"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
            >
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>
          <button
            type="button"
            disabled={!formIsValid}
            onClick={() => setStep("preview")}
            data-testid="tenant-wizard-next"
            className="inline-flex rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Preview
          </button>
        </div>
      ) : null}
      {step === "preview" ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">Review the tenant before provisioning.</p>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium text-slate-500">Slug</dt>
            <dd data-testid="tenant-wizard-preview-slug">{slug}</dd>
            <dt className="font-medium text-slate-500">Name</dt>
            <dd data-testid="tenant-wizard-preview-name">{name}</dd>
            <dt className="font-medium text-slate-500">Plan</dt>
            <dd data-testid="tenant-wizard-preview-plan">{plan}</dd>
          </dl>
          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800" data-testid="tenant-wizard-error">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("details")}
              className="inline-flex rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setStep("submit");
                void handleSubmit();
              }}
              data-testid="tenant-wizard-submit"
              className="inline-flex rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Provision tenant
            </button>
          </div>
        </div>
      ) : null}
      {step === "submit" ? (
        <p className="text-sm text-slate-600" data-testid="tenant-wizard-submitting">
          {submitting ? "Provisioning tenant..." : error ?? "Tenant created. Redirecting..."}
        </p>
      ) : null}
    </section>
  );
}
