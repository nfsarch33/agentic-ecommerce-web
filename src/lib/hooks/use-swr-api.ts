import useSWR from "swr";
import type { SWRConfiguration } from "swr";

export interface UseSWRApiOptions<T> extends SWRConfiguration<T> {
  readonly params?: Record<string, string>;
}

function buildUrl(base: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return base;
  const qs = new URLSearchParams(params).toString();
  return `${base}?${qs}`;
}

export function useSWRApi<T = unknown>(
  endpoint: string | null,
  options?: UseSWRApiOptions<T>,
) {
  const { params, ...swrOpts } = options ?? {};
  const key = endpoint ? buildUrl(endpoint, params) : null;
  return useSWR<T>(key, swrOpts);
}

export type { SWRConfiguration };
