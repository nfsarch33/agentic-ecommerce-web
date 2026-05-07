"use client";

import { useEffect, useState } from "react";
import { listAgents, type ListAgentsInput } from "@/lib/usecases/agents";
import type { AgentSummary } from "@/lib/domain/agent";

export interface UseAgentStatusPollingInput {
  readonly apiBaseUrl: string;
  readonly initialAgents: readonly AgentSummary[];
  readonly intervalMs?: number;
  readonly listAgentsImpl?: (opts: ListAgentsInput) => Promise<readonly AgentSummary[]>;
}

export interface UseAgentStatusPollingResult {
  readonly agents: readonly AgentSummary[];
  readonly error: string | null;
  readonly isPolling: boolean;
}

export function useAgentStatusPolling({
  apiBaseUrl,
  initialAgents,
  intervalMs = 5000,
  listAgentsImpl = listAgents,
}: UseAgentStatusPollingInput): UseAgentStatusPollingResult {
  const [agents, setAgents] = useState<readonly AgentSummary[]>(initialAgents);
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
        const nextAgents = await listAgentsImpl({ baseUrl: apiBaseUrl });
        if (!stopped) {
          setAgents(nextAgents);
          setError(null);
        }
      } catch (err) {
        if (!stopped) {
          setError(err instanceof Error ? err.message : "Unable to refresh agent status.");
        }
      } finally {
        inFlight = false;
        if (!stopped) setIsPolling(false);
      }
    }

    const timer = window.setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl, intervalMs, listAgentsImpl]);

  return { agents, error, isPolling };
}
