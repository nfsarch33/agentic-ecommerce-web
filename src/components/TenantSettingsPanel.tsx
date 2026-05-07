"use client";

import { useState } from "react";
import { saveTenantSettings, type SaveTenantSettingsInput } from "@/lib/usecases/tenant-settings";
import type { TenantSettings } from "@/lib/domain/tenant";

export interface TenantSettingsPanelProps {
  readonly apiBaseUrl: string;
  readonly settings: TenantSettings;
  readonly updateTenantSettingsImpl?: (input: SaveTenantSettingsInput) => Promise<TenantSettings>;
}

export function TenantSettingsPanel({
  apiBaseUrl,
  settings,
  updateTenantSettingsImpl = saveTenantSettings,
}: TenantSettingsPanelProps) {
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updatePreference<K extends keyof TenantSettings["preferences"]>(
    key: K,
    value: TenantSettings["preferences"][K],
  ): void {
    setDraft((current) => ({
      ...current,
      preferences: { ...current.preferences, [key]: value },
    }));
  }

  function updateBranding<K extends keyof TenantSettings["branding"]>(
    key: K,
    value: TenantSettings["branding"][K],
  ): void {
    setDraft((current) => ({
      ...current,
      branding: { ...current.branding, [key]: value },
    }));
  }

  async function handleSave(): Promise<void> {
    setMessage(null);
    setError(null);
    setIsSaving(true);
    try {
      const saved = await updateTenantSettingsImpl({ baseUrl: apiBaseUrl, settings: draft });
      setDraft(saved);
      setMessage("Tenant settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save tenant settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Tenant administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tenant Settings</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Configure non-secret branding and AI/compliance preferences for the active tenant.
        </p>
      </header>

      {(message || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-6 rounded-md border p-4 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section className="grid gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <div>
          <label htmlFor="tenant-display-name" className="text-sm font-semibold text-gray-900">
            Display name
          </label>
          <input
            id="tenant-display-name"
            value={draft.displayName}
            onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="tenant-logo-url" className="text-sm font-semibold text-gray-900">
            Logo URL
          </label>
          <input
            id="tenant-logo-url"
            value={draft.branding.logoUrl ?? ""}
            onChange={(event) => updateBranding("logoUrl", event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="tenant-primary-color" className="text-sm font-semibold text-gray-900">
            Primary color
          </label>
          <input
            id="tenant-primary-color"
            value={draft.branding.primaryColor}
            onChange={(event) => updateBranding("primaryColor", event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="tenant-accent-color" className="text-sm font-semibold text-gray-900">
            Accent color
          </label>
          <input
            id="tenant-accent-color"
            value={draft.branding.accentColor}
            onChange={(event) => updateBranding("accentColor", event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="tenant-locale" className="text-sm font-semibold text-gray-900">
            Default locale
          </label>
          <input
            id="tenant-locale"
            value={draft.preferences.defaultLocale}
            onChange={(event) => updatePreference("defaultLocale", event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="tenant-currency" className="text-sm font-semibold text-gray-900">
            Currency
          </label>
          <input
            id="tenant-currency"
            value={draft.preferences.currency}
            onChange={(event) => updatePreference("currency", event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="tenant-timezone" className="text-sm font-semibold text-gray-900">
            Timezone
          </label>
          <input
            id="tenant-timezone"
            value={draft.preferences.timezone}
            onChange={(event) => updatePreference("timezone", event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="tenant-ai-tone" className="text-sm font-semibold text-gray-900">
            AI tone
          </label>
          <input
            id="tenant-ai-tone"
            value={draft.preferences.aiTone}
            onChange={(event) => updatePreference("aiTone", event.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-gray-900">
          <input
            type="checkbox"
            checked={draft.preferences.complianceStrictMode}
            onChange={(event) => updatePreference("complianceStrictMode", event.target.checked)}
            className="size-4 rounded border-gray-300"
          />
          Strict compliance mode
        </label>
        <div>
          <label htmlFor="tenant-retention-days" className="text-sm font-semibold text-gray-900">
            Data retention days
          </label>
          <input
            id="tenant-retention-days"
            type="number"
            min={1}
            value={draft.preferences.dataRetentionDays}
            onChange={(event) => updatePreference("dataRetentionDays", Number(event.target.value))}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
          />
        </div>
      </section>

      <button
        type="button"
        disabled={isSaving}
        onClick={() => void handleSave()}
        className="mt-6 cursor-pointer rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--color-brand-700)] disabled:cursor-wait disabled:bg-gray-300"
      >
        {isSaving ? "Saving..." : "Save tenant settings"}
      </button>
    </main>
  );
}
