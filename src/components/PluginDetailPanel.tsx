"use client";

import { useState } from "react";
import type { Installation, PluginManifest } from "@/lib/domain/marketplace";
import { canActivate, canDeactivate, canUninstall } from "@/lib/domain/marketplace";
import { InstallationStatusPill } from "./InstallationStatusPill";
import {
  activatePluginUsecase,
  deactivatePluginUsecase,
  installPluginUsecase,
  uninstallPluginUsecase,
} from "@/lib/usecases/install-plugin";

export interface PluginDetailPanelProps {
  readonly manifest: PluginManifest;
  readonly initialInstallation?: Installation;
  readonly baseUrl: string;
  readonly tenantId: string;
}

type LifecycleAction = "install" | "activate" | "deactivate" | "uninstall";

export function PluginDetailPanel({ manifest, initialInstallation, baseUrl, tenantId }: PluginDetailPanelProps) {
  const [installation, setInstallation] = useState<Installation | undefined>(initialInstallation);
  const [busy, setBusy] = useState<LifecycleAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runLifecycle(action: LifecycleAction): Promise<void> {
    setError(null);
    setBusy(action);
    try {
      const opts = { baseUrl, tenantId, slug: manifest.slug };
      if (action === "install") {
        const result = await installPluginUsecase(opts);
        if (result.ok) setInstallation(result.installation);
        else setError(result.error);
      } else if (action === "activate") {
        const result = await activatePluginUsecase(opts);
        if (result.ok) setInstallation(result.installation);
        else setError(result.error);
      } else if (action === "deactivate") {
        const result = await deactivatePluginUsecase(opts);
        if (result.ok) setInstallation(result.installation);
        else setError(result.error);
      } else if (action === "uninstall") {
        const result = await uninstallPluginUsecase(opts);
        if (result.ok) setInstallation(undefined);
        else setError(result.error);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      data-testid={`plugin-detail-${manifest.slug}`}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{manifest.name}</h1>
          <p className="text-sm text-slate-500">
            {manifest.vendor} · v{manifest.version}
          </p>
        </div>
        {installation ? <InstallationStatusPill state={installation.state} /> : null}
      </header>
      {manifest.description ? <p className="text-sm text-slate-700">{manifest.description}</p> : null}
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800" data-testid="plugin-detail-error">
          {error}
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-700">
        {manifest.category ? (
          <>
            <dt className="font-medium">Category</dt>
            <dd>{manifest.category}</dd>
          </>
        ) : null}
        {manifest.permissions.length > 0 ? (
          <>
            <dt className="font-medium">Permissions</dt>
            <dd>{manifest.permissions.join(", ")}</dd>
          </>
        ) : null}
        {manifest.eventSubscriptions.length > 0 ? (
          <>
            <dt className="font-medium">Event subscriptions</dt>
            <dd>{manifest.eventSubscriptions.join(", ")}</dd>
          </>
        ) : null}
        {manifest.dependencies.length > 0 ? (
          <>
            <dt className="font-medium">Dependencies</dt>
            <dd>
              <ul className="list-disc pl-4">
                {manifest.dependencies.map((d) => (
                  <li key={d.slug}>
                    {d.slug} {d.constraint ?? "^*"}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        ) : null}
      </dl>
      <div className="flex flex-wrap gap-2">
        {!installation ? (
          <button
            type="button"
            data-testid={`plugin-action-install-${manifest.slug}`}
            disabled={busy !== null}
            onClick={() => runLifecycle("install")}
            className="inline-flex rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Install
          </button>
        ) : null}
        {installation && canActivate(installation.state) ? (
          <button
            type="button"
            data-testid={`plugin-action-activate-${manifest.slug}`}
            disabled={busy !== null}
            onClick={() => runLifecycle("activate")}
            className="inline-flex rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Activate
          </button>
        ) : null}
        {installation && canDeactivate(installation.state) ? (
          <button
            type="button"
            data-testid={`plugin-action-deactivate-${manifest.slug}`}
            disabled={busy !== null}
            onClick={() => runLifecycle("deactivate")}
            className="inline-flex rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Deactivate
          </button>
        ) : null}
        {installation && canUninstall(installation.state) ? (
          <button
            type="button"
            data-testid={`plugin-action-uninstall-${manifest.slug}`}
            disabled={busy !== null}
            onClick={() => runLifecycle("uninstall")}
            className="inline-flex rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Uninstall
          </button>
        ) : null}
      </div>
    </section>
  );
}
