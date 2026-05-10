import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useSWRApi } from "./use-swr-api";

async function testFetcher(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function wrapper({ children }: { readonly children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher: testFetcher, provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

function TestHook({ endpoint, params }: { readonly endpoint: string | null; readonly params?: Record<string, string> }) {
  const { data, error, isLoading } = useSWRApi<{ result: string }>(endpoint, { params });
  if (isLoading) return <span data-testid="loading">loading</span>;
  if (error) return <span data-testid="error">{(error as Error).message}</span>;
  return <span data-testid="data">{JSON.stringify(data)}</span>;
}

describe("useSWRApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds URL with query params and fetches", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "ok" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <TestHook endpoint="/api/payments" params={{ tenant_id: "t1", status: "pending" }} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByTestId("data")).toHaveTextContent('{"result":"ok"}');
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/payments?tenant_id=t1&status=pending",
    );
  });

  it("skips fetch when endpoint is null", () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    render(<TestHook endpoint={null} />, { wrapper });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches without params when none provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: "bare" }),
      }),
    );

    render(<TestHook endpoint="/api/test" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId("data")).toHaveTextContent('{"result":"bare"}');
    });
  });
});
