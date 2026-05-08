"use client";

import { useMemo, useState } from "react";
import {
  createCustomComplianceRule,
  deleteCustomComplianceRule,
  exportComplianceReport,
  updateCustomComplianceRule,
  type ComplianceReportExport,
  type CreateCustomComplianceRuleOptions,
  type DeleteCustomComplianceRuleOptions,
  type ExportComplianceReportOptions,
  type UpdateCustomComplianceRuleOptions,
} from "@/lib/adapters/api/compliance";
import {
  ruleCoveragePercent,
  type ComplianceReportSummary,
  type ComplianceRuleCategory,
  type ComplianceSeverity,
  type CustomComplianceOperator,
  type CustomComplianceRule,
} from "@/lib/domain/compliance";

export interface ComplianceReportingPanelProps {
  readonly apiBaseUrl: string;
  readonly reportSummary: ComplianceReportSummary;
  readonly customRules: readonly CustomComplianceRule[];
  readonly exportReportImpl?: (
    opts: ExportComplianceReportOptions,
  ) => Promise<ComplianceReportExport>;
  readonly createRuleImpl?: (
    opts: CreateCustomComplianceRuleOptions,
  ) => Promise<CustomComplianceRule>;
  readonly updateRuleImpl?: (
    opts: UpdateCustomComplianceRuleOptions,
  ) => Promise<CustomComplianceRule>;
  readonly deleteRuleImpl?: (opts: DeleteCustomComplianceRuleOptions) => Promise<void>;
}

interface RuleFormState {
  readonly name: string;
  readonly code: string;
  readonly description: string;
  readonly category: ComplianceRuleCategory;
  readonly severity: ComplianceSeverity;
  readonly field: string;
  readonly operator: CustomComplianceOperator;
  readonly value: string;
}

const emptyRuleForm: RuleFormState = {
  name: "",
  code: "",
  description: "",
  category: "content",
  severity: "warning",
  field: "",
  operator: "does_not_contain",
  value: "",
};

function severityClasses(severity: ComplianceSeverity): string {
  if (severity === "critical") return "bg-red-50 text-red-700 ring-red-200";
  if (severity === "warning") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

function downloadReport(exported: ComplianceReportExport): void {
  if (typeof window === "undefined" || typeof URL.createObjectURL !== "function") return;
  const blob = new Blob([exported.content], { type: exported.mimeType });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = exported.filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function ComplianceReportingPanel({
  apiBaseUrl,
  reportSummary,
  customRules,
  exportReportImpl = exportComplianceReport,
  createRuleImpl = createCustomComplianceRule,
  updateRuleImpl = updateCustomComplianceRule,
  deleteRuleImpl = deleteCustomComplianceRule,
}: ComplianceReportingPanelProps) {
  const [rules, setRules] = useState<readonly CustomComplianceRule[]>(customRules);
  const [form, setForm] = useState<RuleFormState>(emptyRuleForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const latestTrend = useMemo(() => reportSummary.trends.at(-1), [reportSummary.trends]);

  function updateForm<K extends keyof RuleFormState>(key: K, value: RuleFormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleExport(format: "csv" | "json"): Promise<void> {
    setMessage(null);
    setError(null);
    setIsWorking(true);
    try {
      const exported = await exportReportImpl({
        baseUrl: apiBaseUrl,
        tenantId: reportSummary.tenantId,
        format,
      });
      downloadReport(exported);
      setMessage(`Exported ${exported.filename}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export compliance report.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleCreateRule(): Promise<void> {
    setMessage(null);
    setError(null);
    setIsWorking(true);
    try {
      const rule = await createRuleImpl({
        baseUrl: apiBaseUrl,
        rule: {
          tenantId: reportSummary.tenantId,
          code: form.code,
          name: form.name,
          description: form.description,
          category: form.category,
          severity: form.severity,
          enabled: true,
          condition: { field: form.field, operator: form.operator, value: form.value },
        },
      });
      setRules((current) => [rule, ...current]);
      setForm(emptyRuleForm);
      setMessage("Custom compliance rule created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create custom rule.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleToggleRule(rule: CustomComplianceRule): Promise<void> {
    setMessage(null);
    setError(null);
    setIsWorking(true);
    try {
      const updated = await updateRuleImpl({
        baseUrl: apiBaseUrl,
        ruleId: rule.id,
        patch: { tenantId: reportSummary.tenantId, enabled: !rule.enabled },
      });
      setRules((current) =>
        current.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
      );
      setMessage(`Custom rule ${updated.enabled ? "enabled" : "disabled"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update custom rule.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDeleteRule(rule: CustomComplianceRule): Promise<void> {
    setMessage(null);
    setError(null);
    setIsWorking(true);
    try {
      await deleteRuleImpl({
        baseUrl: apiBaseUrl,
        tenantId: reportSummary.tenantId,
        ruleId: rule.id,
      });
      setRules((current) => current.filter((candidate) => candidate.id !== rule.id));
      setMessage("Custom compliance rule deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete custom rule.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="mb-8 space-y-8" aria-label="Compliance reporting">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Tenant compliance
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Compliance Reporting</h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Track pass/fail movement, rule coverage, and tenant-specific rule overrides for the
          selected period.
        </p>
      </div>

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

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Pass rate</h3>
          <p className="mt-2 text-2xl font-semibold text-green-700">
            {reportSummary.passRate}% pass rate
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Fail rate</h3>
          <p className="mt-2 text-2xl font-semibold text-red-700">
            {reportSummary.failRate}% fail rate
          </p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Average score</h3>
          <p className="mt-2 text-2xl font-semibold">{reportSummary.averageScore}/100</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Latest trend</h3>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {latestTrend
              ? `${latestTrend.date}: ${latestTrend.passed} passed, ${latestTrend.failed} failed`
              : "No trend data"}
          </p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">Pass/fail trends</h3>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isWorking}
                onClick={() => void handleExport("csv")}
                className="cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 transition-colors duration-200 hover:bg-gray-50 disabled:text-gray-400"
              >
                Export CSV
              </button>
              <button
                type="button"
                disabled={isWorking}
                onClick={() => void handleExport("json")}
                className="cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 transition-colors duration-200 hover:bg-gray-50 disabled:text-gray-400"
              >
                Export JSON
              </button>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {reportSummary.trends.map((trend) => (
              <div key={trend.date} className="rounded-md border border-gray-200 p-4">
                <p className="font-semibold text-gray-950">{trend.date}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {trend.passed} passed / {trend.failed} failed / {trend.needsReview} need review,{" "}
                  {trend.averageScore}/100 average
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-semibold">Rule coverage</h3>
          <div className="mt-5 space-y-3">
            {reportSummary.ruleCoverage.map((coverage) => (
              <article key={coverage.ruleId} className="rounded-md border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-gray-950">{coverage.ruleName}</h4>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {ruleCoveragePercent(coverage)}% coverage
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {coverage.checked} checks, {coverage.failed} failures
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold">Custom compliance rules</h3>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <input
            aria-label="Rule name"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            placeholder="Rule name"
            className="rounded-md border border-gray-300 p-3 text-sm"
          />
          <input
            aria-label="Rule code"
            value={form.code}
            onChange={(event) => updateForm("code", event.target.value)}
            placeholder="copy.health_claims"
            className="rounded-md border border-gray-300 p-3 text-sm"
          />
          <select
            aria-label="Severity"
            value={form.severity}
            onChange={(event) => updateForm("severity", event.target.value as ComplianceSeverity)}
            className="rounded-md border border-gray-300 p-3 text-sm"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <textarea
            aria-label="Description"
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
            placeholder="Rule description"
            className="rounded-md border border-gray-300 p-3 text-sm lg:col-span-3"
          />
          <input
            aria-label="Field"
            value={form.field}
            onChange={(event) => updateForm("field", event.target.value)}
            placeholder="description"
            className="rounded-md border border-gray-300 p-3 text-sm"
          />
          <select
            aria-label="Operator"
            value={form.operator}
            onChange={(event) =>
              updateForm("operator", event.target.value as CustomComplianceOperator)
            }
            className="rounded-md border border-gray-300 p-3 text-sm"
          >
            <option value="does_not_contain">Does not contain</option>
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="not_equals">Not equals</option>
            <option value="min_score">Minimum score</option>
            <option value="max_score">Maximum score</option>
          </select>
          <input
            aria-label="Value"
            value={form.value}
            onChange={(event) => updateForm("value", event.target.value)}
            placeholder="cure"
            className="rounded-md border border-gray-300 p-3 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={isWorking}
          onClick={() => void handleCreateRule()}
          className="mt-5 cursor-pointer rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--color-brand-700)] disabled:cursor-wait disabled:bg-gray-300"
        >
          Create rule
        </button>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {rules.map((rule) => (
            <article
              key={rule.id}
              aria-label={rule.name}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-950">{rule.name}</h4>
                  <p className="mt-1 text-xs text-gray-500">{rule.code}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${severityClasses(rule.severity)}`}
                >
                  {rule.severity}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-700">{rule.description}</p>
              <p className="mt-2 text-xs text-gray-500">
                {rule.condition.field} {rule.condition.operator} {rule.condition.value}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void handleToggleRule(rule)}
                  className="cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 disabled:text-gray-400"
                >
                  {rule.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => void handleDeleteRule(rule)}
                  className="cursor-pointer rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:text-gray-400"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
