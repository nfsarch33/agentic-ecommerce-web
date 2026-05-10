"use client";

import { useState } from "react";
import { ALLOWED_SEED_SOURCES, type WizardSeeding } from "@/lib/domain/onboarding-wizard";

export interface SeedingStepProps {
  readonly initial?: WizardSeeding;
  readonly onSubmit: (s: WizardSeeding) => Promise<void> | void;
  readonly disabled?: boolean;
}

export function SeedingStep({ initial, onSubmit, disabled }: SeedingStepProps) {
  const [source, setSource] = useState<string>(initial?.source ?? "1688");
  const [itemCount, setItemCount] = useState<number>(initial?.itemCount ?? 25);

  function isValid(): boolean {
    return (
      ALLOWED_SEED_SOURCES.includes(source as (typeof ALLOWED_SEED_SOURCES)[number]) &&
      itemCount >= 0
    );
  }

  return (
    <form
      data-testid="onboarding-step-seeding"
      className="space-y-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValid()) return;
        void onSubmit({ source, itemCount });
      }}
    >
      <h2 className="text-base font-semibold text-gray-900">Step 4 of 4 -- Initial product seeding</h2>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Seed source</span>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          data-testid="onboarding-seeding-source"
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        >
          {ALLOWED_SEED_SOURCES.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Item count (max 100; 0 = skip)</span>
        <input
          type="number"
          min={0}
          max={100}
          value={itemCount}
          onChange={(e) => setItemCount(Number.parseInt(e.target.value, 10) || 0)}
          data-testid="onboarding-seeding-count"
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={disabled || !isValid()}
        data-testid="onboarding-seeding-submit"
        className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Save seeding and review
      </button>
    </form>
  );
}
