"use client";

import { useEffect, useState } from "react";
import { listRecentEvents, type ListRecentEventsInput } from "@/lib/usecases/events";
import type { EventItem } from "@/lib/domain/event";

export interface UseEventFeedPollingInput {
  readonly apiBaseUrl: string;
  readonly limit?: number;
  readonly intervalMs?: number;
  readonly listEventsImpl?: (opts: ListRecentEventsInput) => Promise<readonly EventItem[]>;
}

export interface UseEventFeedPollingResult {
  readonly events: readonly EventItem[];
  readonly error: string | null;
  readonly isPolling: boolean;
}

export function useEventFeedPolling({
  apiBaseUrl,
  limit = 20,
  intervalMs = 10_000,
  listEventsImpl = listRecentEvents,
}: UseEventFeedPollingInput): UseEventFeedPollingResult {
  const [events, setEvents] = useState<readonly EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    let stopped = false;
    let inFlight = false;

    async function poll(): Promise<void> {
      if (inFlight) return;
      inFlight = true;
      setIsPolling(true);
      try {
        const nextEvents = await listEventsImpl({ baseUrl: apiBaseUrl, limit });
        if (!stopped) {
          setEvents(nextEvents);
          setError(null);
        }
      } catch (err) {
        if (!stopped) {
          setError(err instanceof Error ? err.message : "Unable to refresh event feed.");
        }
      } finally {
        inFlight = false;
        if (!stopped) setIsPolling(false);
      }
    }

    void poll();

    const timer = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl, limit, intervalMs, listEventsImpl]);

  return { events, error, isPolling };
}
