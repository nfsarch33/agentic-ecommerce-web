import { describe, expect, it, vi } from "vitest";
import { MarketplaceApiError } from "@/lib/adapters/api/marketplace";
import {
  activatePluginUsecase,
  deactivatePluginUsecase,
  installPluginUsecase,
  uninstallPluginUsecase,
} from "./install-plugin";

const baseInstallation = {
  tenantId: "tenant-a",
  slug: "stripe-payments",
  installedVersion: "1.0.0",
  state: "installed" as const,
  installedAt: "2026-05-08T10:00:00Z",
  updatedAt: "2026-05-08T10:00:00Z",
};

describe("plugin lifecycle usecases", () => {
  it("install returns ok on success", async () => {
    const installImpl = vi.fn(async () => baseInstallation);
    const result = await installPluginUsecase(
      { baseUrl: "http://x", tenantId: "t", slug: "stripe-payments" },
      { installImpl },
    );
    expect(result).toEqual({ ok: true, installation: baseInstallation });
  });

  it("install surfaces MarketplaceApiError", async () => {
    const installImpl = vi.fn(async () => {
      throw new MarketplaceApiError("conflict");
    });
    const result = await installPluginUsecase(
      { baseUrl: "http://x", tenantId: "t", slug: "stripe-payments" },
      { installImpl },
    );
    expect(result).toEqual({ ok: false, error: "conflict" });
  });

  it("install surfaces generic error", async () => {
    const installImpl = vi.fn(async () => {
      throw new Error("oops");
    });
    const result = await installPluginUsecase(
      { baseUrl: "http://x", tenantId: "t", slug: "stripe-payments" },
      { installImpl },
    );
    expect(result).toEqual({ ok: false, error: "oops" });
  });

  it("activate/deactivate forwards", async () => {
    const activateImpl = vi.fn(async () => ({ ...baseInstallation, state: "active" as const }));
    expect(
      await activatePluginUsecase(
        { baseUrl: "http://x", tenantId: "t", slug: "x" },
        { activateImpl },
      ),
    ).toEqual({ ok: true, installation: { ...baseInstallation, state: "active" } });
    const deactivateImpl = vi.fn(async () => ({ ...baseInstallation, state: "deactivated" as const }));
    expect(
      await deactivatePluginUsecase(
        { baseUrl: "http://x", tenantId: "t", slug: "x" },
        { deactivateImpl },
      ),
    ).toEqual({ ok: true, installation: { ...baseInstallation, state: "deactivated" } });
  });

  it("uninstall returns ok=true on success", async () => {
    const uninstallImpl = vi.fn(async () => undefined);
    const result = await uninstallPluginUsecase(
      { baseUrl: "http://x", tenantId: "t", slug: "x" },
      { uninstallImpl },
    );
    expect(result).toEqual({ ok: true });
  });

  it("uninstall surfaces error", async () => {
    const uninstallImpl = vi.fn(async () => {
      throw new MarketplaceApiError("nope");
    });
    const result = await uninstallPluginUsecase(
      { baseUrl: "http://x", tenantId: "t", slug: "x" },
      { uninstallImpl },
    );
    expect(result).toEqual({ ok: false, error: "nope" });
  });
});
