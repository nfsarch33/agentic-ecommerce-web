import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { License } from "@/lib/domain/digital";
import { DownloadLinkButton } from "./DownloadLinkButton";

const license: License = {
  id: "lic-1",
  tenantId: "tenant-a",
  productId: "prod-1",
  customerId: "cust-1",
  key: "AAAAA-BBBBB-CCCCC-DDDDD-EEEEEEEE",
  state: "active",
  issuedAt: "2026-05-08T12:00:00Z",
  maxActivations: 1,
  updatedAt: "2026-05-08T12:00:00Z",
};

describe("DownloadLinkButton", () => {
  it("requests a signed URL and renders the link", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          url: "https://cdn.example.com/?lid=lic-1&pid=prod-1&tid=tenant-a&exp=1&uses=1&sig=abc",
          expires_at: "2026-05-08T12:05:00Z",
          uses_allowed: 1,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchImpl);
    try {
      render(<DownloadLinkButton license={license} baseUrl="http://api.test" tenantId="tenant-a" />);
      fireEvent.click(screen.getByTestId("license-download-lic-1"));
      await waitFor(() => {
        expect(screen.getByTestId("license-download-link-lic-1")).toBeVisible();
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("surfaces errors from the adapter", async () => {
    const fetchImpl = vi.fn(async () => new Response("gone", { status: 410 }));
    vi.stubGlobal("fetch", fetchImpl);
    try {
      render(<DownloadLinkButton license={license} baseUrl="http://api.test" tenantId="tenant-a" />);
      fireEvent.click(screen.getByTestId("license-download-lic-1"));
      await waitFor(() => {
        expect(screen.getByTestId("license-download-error-lic-1").textContent).toMatch(/HTTP 410/);
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("blocks downloads on revoked licences before the network call", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    try {
      render(<DownloadLinkButton license={{ ...license, state: "revoked" }} baseUrl="http://api.test" tenantId="tenant-a" />);
      fireEvent.click(screen.getByTestId("license-download-lic-1"));
      await waitFor(() => {
        expect(screen.getByTestId("license-download-error-lic-1").textContent).toMatch(/Download disallowed/);
      });
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
