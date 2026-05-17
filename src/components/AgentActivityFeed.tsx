"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  agentActivityKey,
  agentActivityToneClass,
  formatActivityTimestamp,
  parseAgentActivity,
  type AgentActivity,
  type AgentActivityStatus,
} from "@/lib/domain/agent-activity";

// AgentActivityFeed is the EC-9-2 admin UI surface. It opens an
// EventSource to the BFF SSE proxy at /api/agent-activity/stream and
// renders the most recent N events (default 50) in a scrolling list.
//
// Keeps no server-side state -- the feed is purely append-only on the
// client, with the BFF (and the underlying backend SSE handler) owning
// retention + dropped-event semantics.
export interface AgentActivityFeedProps {
  readonly streamUrl?: string;
  readonly maxEvents?: number;
  // EventSourceImpl lets tests inject a stub. Production wires the
  // browser-native EventSource constructor.
  readonly EventSourceImpl?: typeof EventSource;
}

const DEFAULT_STREAM_URL = "/api/agent-activity/stream";
const DEFAULT_MAX_EVENTS = 50;

const SUBSCRIBED_EVENTS = [
  "price.change.applied",
  "price.change.pending_approval",
  "supplier.cost.changed",
  "order.normalised",
  "dropship.order.placed",
  "dropship.order.rolled_back",
  "dropship.order.pending_approval",
  "customer.message.received",
  "customer.message.replied",
  "customer.message.escalated_to_operator",
] as const;

type ConnectionState = "connecting" | "open" | "closed" | "error";

function approvedStreamUrl(streamUrl: string): string {
  return streamUrl.startsWith("/") ? streamUrl : DEFAULT_STREAM_URL;
}

export function AgentActivityFeed({
  streamUrl = DEFAULT_STREAM_URL,
  maxEvents = DEFAULT_MAX_EVENTS,
  EventSourceImpl,
}: AgentActivityFeedProps) {
  const [activities, setActivities] = useState<readonly AgentActivity[]>([]);
  const [state, setState] = useState<ConnectionState>("connecting");
  const [droppedCount, setDroppedCount] = useState(0);
  const counterRef = useRef(0);

  const Source = useMemo(() => EventSourceImpl ?? (typeof EventSource !== "undefined" ? EventSource : undefined), [EventSourceImpl]);
  const resolvedStreamUrl = useMemo(() => approvedStreamUrl(streamUrl), [streamUrl]);
  const renderedState = Source || typeof window === "undefined" ? state : "error";

  useEffect(() => {
    if (!Source) {
      return;
    }
    const source = new Source(resolvedStreamUrl);
    source.onopen = () => setState("open");
    source.onerror = () => setState("error");

    const append = (incoming: AgentActivity) => {
      setActivities((prev) => {
        const next = [incoming, ...prev];
        return next.length > maxEvents ? next.slice(0, maxEvents) : next;
      });
    };

    const handleMessage = (action: string) => (evt: MessageEvent<string>) => {
      counterRef.current += 1;
      const idHint = `evt-${counterRef.current}`;
      const parsed = parseAgentActivity(evt.data, idHint);
      if (!parsed) return;
      append({ ...parsed, action });
    };

    for (const action of SUBSCRIBED_EVENTS) {
      source.addEventListener(action, handleMessage(action) as EventListener);
    }

    const onDropped = (evt: MessageEvent<string>) => {
      counterRef.current += 1;
      const idHint = `dropped-${counterRef.current}`;
      try {
        const data = JSON.parse(evt.data) as { count?: number };
        setDroppedCount((prev) => prev + (typeof data.count === "number" ? data.count : 1));
        append({
          id: idHint,
          tenantId: "",
          agentId: "system",
          action: "dropped",
          status: "dropped" as AgentActivityStatus,
          timestamp: new Date().toISOString(),
          details: { count: data.count ?? 1 },
        });
      } catch {
        setDroppedCount((prev) => prev + 1);
      }
    };
    source.addEventListener("dropped", onDropped as EventListener);

    return () => {
      source.close();
      setState("closed");
    };
  }, [Source, resolvedStreamUrl, maxEvents]);

  return (
    <section aria-label="Agent activity feed" className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Agent activity</h2>
        <div className="flex items-center gap-3 text-sm">
          <ConnectionBadge state={renderedState} />
          {droppedCount > 0 ? (
            <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">
              {droppedCount} dropped
            </span>
          ) : null}
        </div>
      </header>

      {activities.length === 0 ? (
        <p data-testid="agent-activity-empty" className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
          Waiting for events... the feed will populate as agents publish.
        </p>
      ) : (
        <ol className="grid gap-2" role="list" data-testid="agent-activity-list">
          {activities.map((activity) => (
            <li
              key={agentActivityKey(activity)}
              className="rounded-md border border-gray-200 bg-white p-3 shadow-sm"
              data-testid="agent-activity-item"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${agentActivityToneClass(activity.status)}`}>
                  {activity.status}
                </span>
                <span className="text-sm font-medium text-gray-900">{activity.action}</span>
                <span className="text-xs uppercase tracking-wide text-gray-500">{activity.agentId}</span>
                <span className="ml-auto text-xs text-gray-500">{formatActivityTimestamp(activity.timestamp)}</span>
              </div>
              {activity.details ? (
                <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                  {JSON.stringify(activity.details, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ConnectionBadge({ state }: { readonly state: ConnectionState }) {
  const labels: Record<ConnectionState, { text: string; className: string }> = {
    connecting: { text: "Connecting...", className: "bg-gray-100 text-gray-600" },
    open: { text: "Live", className: "bg-green-50 text-green-700" },
    closed: { text: "Closed", className: "bg-gray-100 text-gray-600" },
    error: { text: "Reconnecting...", className: "bg-amber-50 text-amber-700" },
  };
  const { text, className } = labels[state];
  return (
    <span data-testid="agent-activity-state" className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {text}
    </span>
  );
}
