"use client";

import Link from "next/link";
import { useState } from "react";
import {
  pricingStrategyLabel,
  scheduleFrequencyLabel,
  type AgentSchedule,
  type AgentScheduleFrequency,
  type PricingRecommendation,
  type PricingStrategy,
  type SourcingRecommendation,
} from "@/lib/domain/agent-automation";
import {
  decideRecommendation,
  updateSchedule,
  updateStrategy,
  type DecideRecommendationInput,
  type UpdateScheduleInput,
  type UpdateStrategyInput,
} from "@/lib/usecases/agent-automation";

export interface AgentAutomationPanelProps {
  readonly apiBaseUrl: string;
  readonly initialSourcingRecommendations: readonly SourcingRecommendation[];
  readonly initialPricingStrategies: readonly PricingStrategy[];
  readonly initialPricingRecommendations: readonly PricingRecommendation[];
  readonly initialSchedules: readonly AgentSchedule[];
  readonly decideRecommendationImpl?: (
    opts: DecideRecommendationInput,
  ) => Promise<SourcingRecommendation>;
  readonly updateStrategyImpl?: (opts: UpdateStrategyInput) => Promise<PricingStrategy>;
  readonly updateScheduleImpl?: (opts: UpdateScheduleInput) => Promise<AgentSchedule>;
}

const frequencyOptions: readonly AgentScheduleFrequency[] = ["hourly", "daily", "weekly", "custom"];

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
}

function workflowLink(workflowId?: string) {
  if (!workflowId) return null;
  return (
    <Link
      href={`/admin/workflows/${encodeURIComponent(workflowId)}`}
      className="text-sm font-medium text-[var(--color-brand-700)] underline-offset-2 hover:underline"
    >
      View workflow {workflowId}
    </Link>
  );
}

function statusBadge(status: string): string {
  switch (status) {
    case "approved":
    case "accepted":
      return "bg-green-50 text-green-700";
    case "rejected":
      return "bg-red-50 text-red-700";
    case "adjusted":
    case "pending":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function AgentAutomationPanel({
  apiBaseUrl,
  initialSourcingRecommendations,
  initialPricingStrategies,
  initialPricingRecommendations,
  initialSchedules,
  decideRecommendationImpl = decideRecommendation,
  updateStrategyImpl = updateStrategy,
  updateScheduleImpl = updateSchedule,
}: AgentAutomationPanelProps) {
  const [recommendations, setRecommendations] = useState<readonly SourcingRecommendation[]>(
    initialSourcingRecommendations,
  );
  const [strategies, setStrategies] =
    useState<readonly PricingStrategy[]>(initialPricingStrategies);
  const [schedules, setSchedules] = useState<readonly AgentSchedule[]>(initialSchedules);
  const [adjustedCosts, setAdjustedCosts] = useState<Record<string, string>>({});
  const [strategyMargins, setStrategyMargins] = useState<Record<string, string>>(
    Object.fromEntries(
      initialPricingStrategies.map((strategy) => [
        strategy.id,
        String(strategy.targetMarginPercent),
      ]),
    ),
  );
  const [scheduleFrequencies, setScheduleFrequencies] = useState<
    Record<string, AgentScheduleFrequency>
  >(Object.fromEntries(initialSchedules.map((schedule) => [schedule.id, schedule.frequency])));
  const [scheduleParameters, setScheduleParameters] = useState<Record<string, string>>(
    Object.fromEntries(
      initialSchedules.map((schedule) => [
        schedule.id,
        JSON.stringify(schedule.parameters, null, 2),
      ]),
    ),
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function replaceRecommendation(next: SourcingRecommendation): void {
    setRecommendations((current) => current.map((item) => (item.id === next.id ? next : item)));
  }

  function replaceStrategy(next: PricingStrategy): void {
    setStrategies((current) => current.map((item) => (item.id === next.id ? next : item)));
    setStrategyMargins((current) => ({ ...current, [next.id]: String(next.targetMarginPercent) }));
  }

  function replaceSchedule(next: AgentSchedule): void {
    setSchedules((current) => current.map((item) => (item.id === next.id ? next : item)));
    setScheduleFrequencies((current) => ({ ...current, [next.id]: next.frequency }));
    setScheduleParameters((current) => ({
      ...current,
      [next.id]: JSON.stringify(next.parameters, null, 2),
    }));
  }

  async function submitSourcingDecision(
    recommendation: SourcingRecommendation,
    decision: "approve" | "reject" | "adjust",
  ): Promise<void> {
    const primaryCandidateId =
      recommendation.recommendedCandidateId ?? recommendation.candidates[0]?.id;
    const adjustedUnitCostCents =
      decision === "adjust"
        ? Math.round(Number(adjustedCosts[recommendation.id] ?? "0") * 100)
        : undefined;

    setPendingAction(`${recommendation.id}:${decision}`);
    setMessage(null);
    setError(null);
    try {
      const next = await decideRecommendationImpl({
        baseUrl: apiBaseUrl,
        recommendationId: recommendation.id,
        decision,
        ...(primaryCandidateId ? { candidateId: primaryCandidateId } : {}),
        ...(adjustedUnitCostCents && adjustedUnitCostCents > 0 ? { adjustedUnitCostCents } : {}),
      });
      replaceRecommendation(next);
      const verb =
        decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "adjusted";
      setMessage(`Sourcing recommendation ${verb}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update sourcing recommendation.");
    } finally {
      setPendingAction(null);
    }
  }

  async function saveStrategy(strategy: PricingStrategy): Promise<void> {
    setPendingAction(`strategy:${strategy.id}`);
    setMessage(null);
    setError(null);
    try {
      const next = await updateStrategyImpl({
        baseUrl: apiBaseUrl,
        strategyId: strategy.id,
        enabled: strategy.enabled,
        targetMarginPercent: Number(strategyMargins[strategy.id] ?? strategy.targetMarginPercent),
      });
      replaceStrategy(next);
      setMessage("Pricing rule saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save pricing rule.");
    } finally {
      setPendingAction(null);
    }
  }

  async function saveSchedule(
    schedule: AgentSchedule,
    nextEnabled = schedule.enabled,
    saveMessage = `${schedule.agentName} schedule saved.`,
  ): Promise<void> {
    setPendingAction(`schedule:${schedule.id}`);
    setMessage(null);
    setError(null);
    try {
      const parameters = JSON.parse(scheduleParameters[schedule.id] ?? "{}") as Record<
        string,
        unknown
      >;
      const next = await updateScheduleImpl({
        baseUrl: apiBaseUrl,
        scheduleId: schedule.id,
        enabled: nextEnabled,
        frequency: scheduleFrequencies[schedule.id] ?? schedule.frequency,
        cronExpression: schedule.cronExpression,
        timezone: schedule.timezone,
        parameters,
      });
      replaceSchedule(next);
      setMessage(saveMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save schedule.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="mt-10 grid gap-8" aria-label="Agent automation controls">
      {(message || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`rounded-md border p-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        aria-labelledby="sourcing-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="sourcing-title" className="text-xl font-semibold">
              Sourcing Recommendations
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Review supplier candidates produced by the Temporal-backed sourcing workflow.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {recommendations.length} open
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          {recommendations.map((recommendation) => (
            <article key={recommendation.id} className="rounded-md border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{recommendation.productTitle}</h3>
                  <p className="mt-1 text-sm text-gray-600">{recommendation.rationale}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(recommendation.status)}`}
                >
                  {recommendation.status}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700">
                Confidence {Math.round(recommendation.confidence * 100)}%
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recommendation.candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-md bg-gray-50 p-3">
                    <p className="font-semibold">{candidate.supplierName}</p>
                    <dl className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Unit cost</dt>
                        <dd>{formatMoney(candidate.unitCostCents, candidate.currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Margin</dt>
                        <dd>{candidate.marginPercent}%</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">MOQ</dt>
                        <dd>{candidate.minOrderQuantity}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-gray-500">Lead time</dt>
                        <dd>{candidate.leadTimeDays} days</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-gray-700">Adjusted unit cost</span>
                  <input
                    value={adjustedCosts[recommendation.id] ?? ""}
                    onChange={(event) =>
                      setAdjustedCosts((current) => ({
                        ...current,
                        [recommendation.id]: event.target.value,
                      }))
                    }
                    inputMode="decimal"
                    placeholder="10.50"
                    className="w-36 rounded-md border border-gray-300 px-3 py-2"
                    aria-label={`Adjusted unit cost for ${recommendation.productTitle}`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void submitSourcingDecision(recommendation, "approve")}
                  disabled={pendingAction === `${recommendation.id}:approve`}
                  className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
                  aria-label="Approve sourcing recommendation"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void submitSourcingDecision(recommendation, "reject")}
                  disabled={pendingAction === `${recommendation.id}:reject`}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 disabled:text-gray-400"
                  aria-label="Reject sourcing recommendation"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => void submitSourcingDecision(recommendation, "adjust")}
                  disabled={pendingAction === `${recommendation.id}:adjust`}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 disabled:text-gray-400"
                  aria-label="Adjust sourcing recommendation"
                >
                  Adjust
                </button>
                {workflowLink(recommendation.workflowId)}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        aria-labelledby="pricing-title"
      >
        <h2 id="pricing-title" className="text-xl font-semibold">
          Pricing Rules
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Configure dynamic pricing guardrails while pricing workflows are stabilised.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {strategies.map((strategy) => (
            <article key={strategy.id} className="rounded-md border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{strategy.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {pricingStrategyLabel(strategy.strategy)}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {strategy.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-gray-700">Target margin</span>
                  <input
                    aria-label={`Target margin for ${strategy.name}`}
                    type="number"
                    min="0"
                    max="100"
                    value={strategyMargins[strategy.id] ?? strategy.targetMarginPercent}
                    onChange={(event) =>
                      setStrategyMargins((current) => ({
                        ...current,
                        [strategy.id]: event.target.value,
                      }))
                    }
                    className="rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
                <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                  Min margin <strong>{strategy.minMarginPercent}%</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void saveStrategy(strategy)}
                disabled={pendingAction === `strategy:${strategy.id}`}
                className="mt-4 rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
                aria-label={`Save ${strategy.name} pricing rule`}
              >
                Save rule
              </button>
            </article>
          ))}
        </div>
        {initialPricingRecommendations.length > 0 && (
          <div className="mt-6 grid gap-3">
            <h3 className="text-lg font-semibold">Latest pricing recommendations</h3>
            {initialPricingRecommendations.map((recommendation) => (
              <article key={recommendation.id} className="rounded-md bg-gray-50 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{recommendation.productTitle}</p>
                    <p className="mt-1 text-gray-600">{recommendation.rationale}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(recommendation.status)}`}
                  >
                    {recommendation.status}
                  </span>
                </div>
                <p className="mt-3 text-gray-700">
                  {formatMoney(recommendation.currentPriceCents, recommendation.currency)} to{" "}
                  <strong>
                    {formatMoney(recommendation.recommendedPriceCents, recommendation.currency)}
                  </strong>
                  , expected margin {recommendation.expectedMarginPercent}%
                </p>
                <div className="mt-2">{workflowLink(recommendation.workflowId)}</div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        aria-labelledby="schedules-title"
      >
        <h2 id="schedules-title" className="text-xl font-semibold">
          Agent Schedules
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Enable recurring Temporal schedules and tune run parameters per agent.
        </p>
        <div className="mt-5 grid gap-4">
          {schedules.map((schedule) => (
            <article key={schedule.id} className="rounded-md border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{schedule.agentName}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {scheduleFrequencyLabel(schedule.frequency)} · {schedule.timezone}
                  </p>
                </div>
                {workflowLink(schedule.workflowId)}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[180px_220px_1fr_auto] md:items-start">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    aria-label={`Enable ${schedule.agentName} schedule`}
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={(event) =>
                      void saveSchedule(
                        schedule,
                        event.target.checked,
                        `${schedule.agentName} schedule ${event.target.checked ? "enabled" : "disabled"}.`,
                      )
                    }
                    className="h-4 w-4"
                  />
                  Enabled
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-gray-700">Frequency</span>
                  <select
                    value={scheduleFrequencies[schedule.id] ?? schedule.frequency}
                    onChange={(event) =>
                      setScheduleFrequencies((current) => ({
                        ...current,
                        [schedule.id]: event.target.value as AgentScheduleFrequency,
                      }))
                    }
                    className="rounded-md border border-gray-300 px-3 py-2"
                  >
                    {frequencyOptions.map((frequency) => (
                      <option key={frequency} value={frequency}>
                        {scheduleFrequencyLabel(frequency)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-gray-700">Parameters JSON</span>
                  <textarea
                    value={scheduleParameters[schedule.id] ?? "{}"}
                    onChange={(event) =>
                      setScheduleParameters((current) => ({
                        ...current,
                        [schedule.id]: event.target.value,
                      }))
                    }
                    className="min-h-24 rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveSchedule(schedule)}
                  disabled={pendingAction === `schedule:${schedule.id}`}
                  className="rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
                >
                  Save schedule
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
