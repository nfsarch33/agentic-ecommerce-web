import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SWRProvider } from "./swr-config";
import useSWR from "swr";

function TestConsumer({ url }: { readonly url: string }) {
  const { data, error, isLoading } = useSWR<{ ok: boolean }>(url);
  if (isLoading) return <span data-testid="loading">loading</span>;
  if (error) return <span data-testid="error">{(error as Error).message}</span>;
  return <span data-testid="data">{JSON.stringify(data)}</span>;
}

describe("SWRProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("provides global SWR context with default fetcher", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      }),
    );

    render(
      <SWRProvider>
        <TestConsumer url="/api/test" />
      </SWRProvider>,
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("data")).toHaveTextContent('{"ok":true}');
    });
  });

  it("surfaces HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }),
    );

    render(
      <SWRProvider>
        <TestConsumer url="/api/fail" />
      </SWRProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("HTTP 500");
    });
  });
});
