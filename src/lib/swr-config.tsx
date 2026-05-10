"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

async function globalFetcher(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }
  return response.json();
}

export function SWRProvider({ children }: { readonly children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: globalFetcher,
        revalidateOnFocus: false,
        dedupingInterval: 5_000,
        errorRetryCount: 3,
        errorRetryInterval: 2_000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
