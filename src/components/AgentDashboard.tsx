"use client";

import { useState } from "react";
import {
  agentKindLabel,
  agentStatusTone,
  countRunningAgents,
  type AgentRun,
  type AgentSummary,
} from "@/lib/domain/agent";
import { useAgentStatusPolling } from "@/lib/hooks/use-agent-status-polling";
import {
  fetchAgentRunHistory,
  triggerManualAgentRun,
  type FetchAgentRunHistoryInput,
  type TriggerManualAgentRunInput,
} from "@/lib/usecases/agents";
import type {
  AgentSchedule,
  PricingRecommendation,
  PricingStrategy,
  SourcingRecommendation,
} from "@/lib/domain/agent-automation";
import { AgentAutomationPanel } from "./AgentAutomationPanel";

export interface AgentDashboardProps {
  readonly apiBaseUrl: string;
  readonly initialAgents: readonly AgentSummary[];
  readonly initialSourcingRecommendations?: readonly SourcingRecommendation[];
  readonly initialPricingStrategies?: readonly PricingStrategy[];
  readonly initialPricingRecommendations?: readonly PricingRecommendation[];
  readonly initialSchedules?: readonly AgentSchedule[];
  readonly fetchHistoryImpl?: (opts: FetchAgentRunHistoryInput) => Promise<readonly AgentRun[]>;
  readonly triggerRunImpl?: (opts: TriggerManualAgentRunInput) => Promise<AgentRun>;
}

function formatTimestamp(value?: string): string {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(durationMs?: number): string {
  if (durationMs === undefined) return "Duration unavailable";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${Math.round(durationMs / 1000)}s`;
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return "None";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function statusClasses(status: AgentSummary["status"]): string {
  switch (agentStatusTone(status)) {
    case "blue":
      return "bg-blue-50 text-blue-700";
    case "green":
      return "bg-green-50 text-green-700";
    case "red":
      return "bg-red-50 text-red-700";
    case "amber":
      return "bg-amber-50 text-amber-700";
    case "gray":
      return "bg-gray-100 text-gray-700";
  }
}

export function AgentDashboard({
  apiBaseUrl,
  initialAgents,
  initialSourcingRecommendations = [],
  initialPricingStrategies = [],
  initialPricingRecommendations = [],
  initialSchedules = [],
  fetchHistoryImpl = fetchAgentRunHistory,
  triggerRunImpl = triggerManualAgentRun,
}: AgentDashboardProps) {
  const {
    agents,
    error: pollingError,
    isPolling,
  } = useAgentStatusPolling({
    apiBaseUrl,
    initialAgents,
  });
  const [expandedAgentIds, setExpandedAgentIds] = useState<ReadonlySet<string>>(new Set());
  const [historyByAgentId, setHistoryByAgentId] = useState<
    ReadonlyMap<string, readonly AgentRun[]>
  >(new Map());
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [pendingRunAgentId, setPendingRunAgentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleHistory(agent: AgentSummary): Promise<void> {
    const wasExpanded = expandedAgentIds.has(agent.id);
    setExpandedAgentIds((current) => {
      const next = new Set(current);
      if (wasExpanded) {
        next.delete(agent.id);
      } else {
        next.add(agent.id);
      }
      return next;
    });

    if (wasExpanded || historyByAgentId.has(agent.id)) return;

    setLoadingHistoryId(agent.id);
    setActionError(null);
    try {
      const runs = await fetchHistoryImpl({ baseUrl: apiBaseUrl, agentId: agent.id });
      setHistoryByAgentId((current) => new Map(current).set(agent.id, runs));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to load agent run history.");
    } finally {
      setLoadingHistoryId(null);
    }
  }

  async function triggerRun(agent: AgentSummary): Promise<void> {
    if (!window.confirm(`Trigger ${agent.name} now?`)) return;

    setPendingRunAgentId(agent.id);
    setActionError(null);
    setMessage(null);
    try {
      const run = await triggerRunImpl({ baseUrl: apiBaseUrl, agentId: agent.id });
      setMessage(`Queued manual run ${run.id} for ${agent.name}.`);
      if (expandedAgentIds.has(agent.id)) {
        setHistoryByAgentId((current) => {
          const existing = current.get(agent.id) ?? [];
          return new Map(current).set(agent.id, [run, ...existing]);
        });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to trigger agent run.");
    } finally {
      setPendingRunAgentId(null);
    }
  }

  const runningAgents = countRunningAgents(agents);
  const queuedRuns = agents.reduce((sum, agent) => sum + agent.queuedRuns, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Agent Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Monitor sourcing, content, pricing, and compliance agents. SSE can replace polling after
          the backend exposes a stable event stream; for now status refreshes every 5 seconds.
        </p>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3" aria-label="Agent fleet summary">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Agents</h2>
          <p className="mt-2 text-2xl font-semibold">{agents.length}</p>
          <p className="mt-1 text-xs text-gray-500">
            {isPolling ? "Refreshing..." : "Polling every 5s"}
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Running</h2>
          <p className="mt-2 text-2xl font-semibold">{runningAgents}</p>
          <p className="mt-1 text-xs text-gray-500">Active agent executions</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Queued runs</h2>
          <p className="mt-2 text-2xl font-semibold">{queuedRuns}</p>
          <p className="mt-1 text-xs text-gray-500">Waiting for scheduler capacity</p>
        </article>
      </section>

      {(pollingError || actionError || message) && (
        <div
          role={pollingError || actionError ? "alert" : "status"}
          className={`mb-6 rounded-md border p-4 text-sm ${
            pollingError || actionError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {actionError ?? pollingError ?? message}
        </div>
      )}

      {agents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-600">
          No agents are registered yet. The backend orchestrator should expose agents through GET
          /api/v1/agents.
        </p>
      ) : (
        <section className="grid gap-5" aria-label="Agent status cards">
          {agents.map((agent) => {
            const expanded = expandedAgentIds.has(agent.id);
            const history = historyByAgentId.get(agent.id) ?? [];
            return (
              <article
                key={agent.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
                      {agentKindLabel(agent.kind)} agent
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">{agent.name}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-gray-600">
                      {agent.description ?? "No description has been provided for this agent."}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(agent.status)}`}
                  >
                    {agent.status}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-md bg-gray-50 p-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Last run
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">
                      {formatTimestamp(agent.lastRunAt)}
                    </dd>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Next run
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">
                      {formatTimestamp(agent.nextRunAt)}
                    </dd>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Queue
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-x-2 text-sm font-semibold text-gray-900">
                      <span>{agent.inFlightRuns} active</span>
                      <span>{agent.queuedRuns} queued</span>
                    </dd>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Reliability
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">
                      {Math.round(agent.successRate * 100)}% success
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void triggerRun(agent)}
                    disabled={pendingRunAgentId === agent.id || agent.status === "disabled"}
                    aria-label={`Run ${agent.name} now`}
                    className="cursor-pointer rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--color-brand-700)] disabled:cursor-wait disabled:bg-gray-300"
                  >
                    {pendingRunAgentId === agent.id ? "Queuing..." : "Run now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleHistory(agent)}
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Hide" : "Show"} history for ${agent.name}`}
                    className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition-colors duration-200 hover:bg-gray-50"
                  >
                    {expanded ? "Hide history" : "Show history"}
                  </button>
                </div>

                {expanded && (
                  <section
                    className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4"
                    aria-label={`${agent.name} run history`}
                  >
                    <h3 className="text-lg font-semibold">Run history</h3>
                    {loadingHistoryId === agent.id ? (
                      <p className="mt-3 text-sm text-gray-600">Loading run history...</p>
                    ) : history.length === 0 ? (
                      <p className="mt-3 text-sm text-gray-600">
                        No runs have been recorded for this agent yet.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {history.map((run) => (
                          <details
                            key={run.id}
                            className="rounded-md border border-gray-200 bg-white p-4"
                            open
                          >
                            <summary className="cursor-pointer text-sm font-semibold text-gray-900">
                              {run.status} · {run.trigger} · {formatTimestamp(run.createdAt)}
                            </summary>
                            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Started
                                </dt>
                                <dd className="mt-1 text-sm">{formatTimestamp(run.startedAt)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Finished
                                </dt>
                                <dd className="mt-1 text-sm">{formatTimestamp(run.finishedAt)}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Duration
                                </dt>
                                <dd className="mt-1 text-sm">{formatDuration(run.durationMs)}</dd>
                              </div>
                            </dl>
                            {run.summary && (
                              <p className="mt-3 text-sm text-gray-700">{run.summary}</p>
                            )}
                            {run.error && (
                              <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {run.error}
                              </p>
                            )}
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <section>
                                <h4 className="text-sm font-semibold">Input</h4>
                                <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-gray-100 p-3 text-xs text-gray-900">
                                  {formatJson(run.input)}
                                </pre>
                              </section>
                              <section>
                                <h4 className="text-sm font-semibold">Output</h4>
                                <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-gray-100 p-3 text-xs text-gray-900">
                                  {formatJson(run.output)}
                                </pre>
                              </section>
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </article>
            );
          })}
        </section>
      )}

      <AgentAutomationPanel
        apiBaseUrl={apiBaseUrl}
        initialSourcingRecommendations={initialSourcingRecommendations}
        initialPricingStrategies={initialPricingStrategies}
        initialPricingRecommendations={initialPricingRecommendations}
        initialSchedules={initialSchedules}
      />
    </main>
  );
}
