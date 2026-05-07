"use client";

import {
  eventSeverityTone,
  eventTypeLabel,
  type EventItem,
} from "@/lib/domain/event";
import {
  useEventFeedPolling,
  type UseEventFeedPollingInput,
} from "@/lib/hooks/use-event-feed-polling";

export interface EventActivityFeedProps {
  readonly apiBaseUrl: string;
  readonly limit?: number;
  readonly intervalMs?: number;
  readonly listEventsImpl?: UseEventFeedPollingInput["listEventsImpl"];
}

function severityClasses(severity: EventItem["severity"]): string {
  switch (eventSeverityTone(severity)) {
    case "amber":
      return "border-l-amber-400 bg-amber-50";
    case "red":
      return "border-l-red-400 bg-red-50";
    case "gray":
      return "border-l-gray-300 bg-white";
  }
}

function severityDot(severity: EventItem["severity"]): string {
  switch (eventSeverityTone(severity)) {
    case "amber":
      return "bg-amber-400";
    case "red":
      return "bg-red-500";
    case "gray":
      return "bg-gray-400";
  }
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export function EventActivityFeed({
  apiBaseUrl,
  limit = 20,
  intervalMs = 10_000,
  listEventsImpl,
}: EventActivityFeedProps) {
  const { events, error, isPolling } = useEventFeedPolling({
    apiBaseUrl,
    limit,
    intervalMs,
    listEventsImpl,
  });

  return (
    <section
      className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      aria-label="Event activity feed"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <span className="text-xs text-gray-500">
          {isPolling ? "Refreshing..." : `Polling every ${Math.round(intervalMs / 1000)}s`}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {events.length === 0 && !error ? (
        <p className="mt-4 text-sm text-gray-500">
          No recent events. Activity will appear here once the backend event bus is active.
        </p>
      ) : (
        <ul className="mt-4 space-y-2" role="list">
          {events.map((event) => (
            <li
              key={event.id}
              className={`rounded-md border-l-4 p-3 text-sm ${severityClasses(event.severity)}`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${severityDot(event.severity)}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium text-gray-900">
                      {eventTypeLabel(event.type)}
                    </span>
                    <time
                      className="shrink-0 text-xs text-gray-500"
                      dateTime={event.occurredAt}
                    >
                      {formatRelativeTime(event.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-gray-700">{event.message}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
