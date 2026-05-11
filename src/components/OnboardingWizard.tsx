"use client";

// File scope: v3.9.1 Existing #10 onboarding wizard (multi-step
// form). Renders the four step components and orchestrates the
// HTTP requests to the BFF route at /api/onboarding/*.
//
// v5.6.0: step components are lazy-loaded per step to reduce the
// initial chunk size — only the active step's code is fetched.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  parseWizardState,
  type OnboardingWizardState,
  type WizardChannels,
  type WizardCompliance,
  type WizardIdentity,
  type WizardSeeding,
} from "@/lib/domain/onboarding-wizard";

function StepSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="h-5 w-48 rounded bg-gray-200" />
      <div className="h-9 w-full rounded bg-gray-100" />
      <div className="h-9 w-full rounded bg-gray-100" />
      <div className="h-9 w-3/4 rounded bg-gray-100" />
    </div>
  );
}

const IdentityStep = dynamic(
  () => import("@/components/onboarding/IdentityStep").then((m) => m.IdentityStep),
  { loading: () => <StepSkeleton /> },
);
const ChannelsStep = dynamic(
  () => import("@/components/onboarding/ChannelsStep").then((m) => m.ChannelsStep),
  { loading: () => <StepSkeleton /> },
);
const ComplianceStep = dynamic(
  () => import("@/components/onboarding/ComplianceStep").then((m) => m.ComplianceStep),
  { loading: () => <StepSkeleton /> },
);
const SeedingStep = dynamic(
  () => import("@/components/onboarding/SeedingStep").then((m) => m.SeedingStep),
  { loading: () => <StepSkeleton /> },
);

export interface OnboardingWizardProps {
  readonly tenantId?: string;
  readonly fetchImpl?: typeof fetch;
}

type Phase = "loading" | "ready" | "completed" | "error";

interface WizardData {
  readonly state?: OnboardingWizardState;
  readonly errorMessage?: string;
}

export function OnboardingWizard({ tenantId, fetchImpl }: OnboardingWizardProps) {
  const fetcher = fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
  const [phase, setPhase] = useState<Phase>(() => (fetcher ? "loading" : "error"));
  const [data, setData] = useState<WizardData>(() =>
    fetcher ? {} : { errorMessage: "fetch unavailable" },
  );
  const renderedPhase = fetcher ? phase : "error";

  useEffect(() => {
    if (!fetcher) {
      return;
    }
    let cancelled = false;
    async function start() {
      try {
        const params = new URLSearchParams();
        if (tenantId) params.set("tenant_id", tenantId);
        const response = await fetcher!(`/api/onboarding/start?${params.toString()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as Record<string, unknown>;
        const tenant = typeof body.tenant_id === "string" ? body.tenant_id : tenantId ?? "";
        const wizardId = typeof body.wizard_id === "string" ? body.wizard_id : "";
        if (!wizardId) throw new Error("wizard id missing");
        const state: OnboardingWizardState = {
          tenantId: tenant,
          wizardId,
          currentStep: 1,
          completedSteps: [],
          completed: false,
        };
        if (cancelled) return;
        setData({ state });
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        setPhase("error");
        setData({ errorMessage: err instanceof Error ? err.message : "unknown" });
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, [fetcher, tenantId]);

  if (renderedPhase === "loading") {
    return (
      <section data-testid="onboarding-loading" className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
        Starting onboarding wizard...
      </section>
    );
  }
  if (renderedPhase === "error") {
    return (
      <section data-testid="onboarding-error" className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        Onboarding failed to start: {data.errorMessage ?? "unknown"}
      </section>
    );
  }
  if (renderedPhase === "completed" && data.state) {
    return (
      <section data-testid="onboarding-completed" className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-base font-semibold text-emerald-800">Onboarding complete</h2>
        <p className="text-sm text-emerald-700">
          Tenant <code>{data.state.tenantId}</code> provisioned with wizard{" "}
          <code>{data.state.wizardId}</code>. The Temporal workflow is finalising default plugin +
          channel configuration.
        </p>
      </section>
    );
  }
  if (!data.state) {
    return null;
  }

  async function submit(step: number, body: unknown): Promise<void> {
    if (!fetcher || !data.state) return;
    const params = new URLSearchParams();
    if (data.state.tenantId) params.set("tenant_id", data.state.tenantId);
    const url =
      step === 5
        ? `/api/onboarding/${data.state.wizardId}/complete?${params.toString()}`
        : `/api/onboarding/${data.state.wizardId}/step/${step}?${params.toString()}`;
    const response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setPhase("error");
      setData((prev) => ({ ...prev, errorMessage: `HTTP ${response.status}` }));
      return;
    }
    if (step === 5) {
      setPhase("completed");
      return;
    }
    const next = parseWizardState(await response.json());
    if (next) {
      setData({ state: next });
    }
  }

  const state = data.state;
  return (
    <section data-testid="onboarding-wizard" className="space-y-4">
      <header className="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-600">
        Step {state.currentStep > 4 ? "complete" : `${state.currentStep} of 4`} -- wizard id{" "}
        <code>{state.wizardId}</code>
      </header>
      {state.currentStep === 1 ? (
        <IdentityStep
          onSubmit={(id: WizardIdentity) =>
            submit(1, {
              tenant_name: id.tenantName,
              owner_email: id.ownerEmail,
              country: id.country,
              business_type: id.businessType,
            })
          }
        />
      ) : null}
      {state.currentStep === 2 ? (
        <ChannelsStep
          onSubmit={(ch: WizardChannels) => submit(2, { channels: [...ch.channels] })}
        />
      ) : null}
      {state.currentStep === 3 ? (
        <ComplianceStep
          identity={state.identity}
          onSubmit={(c: WizardCompliance) => submit(3, { compliance: [...c.compliance] })}
        />
      ) : null}
      {state.currentStep === 4 ? (
        <SeedingStep
          onSubmit={(s: WizardSeeding) =>
            submit(4, { source: s.source, item_count: s.itemCount ?? 0 })
          }
        />
      ) : null}
      {state.currentStep >= 5 ? (
        <button
          type="button"
          data-testid="onboarding-finalise"
          onClick={() => void submit(5, {})}
          className="inline-flex justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Finalise onboarding
        </button>
      ) : null}
    </section>
  );
}
