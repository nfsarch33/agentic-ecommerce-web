"use client";

import { useState } from "react";
import Link from "next/link";
import {
  generateDescription,
  type GenerateDescriptionOptions,
} from "@/lib/adapters/api/ai-content";
import {
  qualityScoreLabel,
  selectLatestSuggestion,
  type AIProductDescriptionSuggestion,
  type QualityScore,
} from "@/lib/domain/ai-description";
import type { ProductFields } from "@/lib/domain/product";
import { defaultDescriptionPrompt } from "@/lib/usecases/product-content-editor";
import { startProductPublish, type StartProductPublishInput } from "@/lib/usecases/workflows";

export interface AIProductDescriptionPanelProps {
  readonly apiBaseUrl: string;
  readonly product: ProductFields;
  readonly initialSuggestions: readonly AIProductDescriptionSuggestion[];
  readonly generateDescriptionImpl?: (
    opts: GenerateDescriptionOptions,
  ) => Promise<AIProductDescriptionSuggestion>;
  readonly startProductPublishImpl?: (
    input: StartProductPublishInput,
  ) => Promise<{ readonly id: string }>;
  readonly allowBffFallback?: boolean;
  readonly fallbackBffBaseUrl?: string;
}

const dimensionLabels: Array<readonly [keyof QualityScore["breakdown"], string]> = [
  ["readability", "Readability"],
  ["seo", "SEO"],
  ["tone", "Tone"],
  ["length", "Length"],
  ["factual", "Factual"],
];

function QualityScoreSummary({ score }: { readonly score?: QualityScore }) {
  if (!score) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Quality score unavailable for this suggestion.
      </div>
    );
  }

  return (
    <section aria-label="Quality score breakdown" className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Quality score</h3>
          <p className="mt-1 text-xs text-gray-600">{qualityScoreLabel(score)}</p>
        </div>
        <p className="text-3xl font-semibold text-green-700">{score.overall}/100</p>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-5">
        {dimensionLabels.map(([key, label]) => (
          <div key={key} className="rounded-md bg-gray-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{score.breakdown[key]}</dd>
          </div>
        ))}
      </dl>
      {score.notes.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
          {score.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AIProductDescriptionPanel({
  apiBaseUrl,
  product,
  initialSuggestions,
  generateDescriptionImpl = generateDescription,
  startProductPublishImpl = startProductPublish,
  allowBffFallback = process.env.NODE_ENV !== "production",
  fallbackBffBaseUrl = "",
}: AIProductDescriptionPanelProps) {
  const [suggestions, setSuggestions] =
    useState<readonly AIProductDescriptionSuggestion[]>(initialSuggestions);
  const [activeSuggestion, setActiveSuggestion] = useState<
    AIProductDescriptionSuggestion | undefined
  >(() => selectLatestSuggestion(initialSuggestions));
  const [prompt, setPrompt] = useState(defaultDescriptionPrompt(product));
  const [editableDescription, setEditableDescription] = useState(product.description ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishWorkflowId, setPublishWorkflowId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(): Promise<void> {
    const trimmedPrompt = prompt.trim();
    setMessage(null);
    setError(null);
    if (trimmedPrompt === "") {
      setError("Enter a generation prompt before asking the content agent.");
      return;
    }

    setIsGenerating(true);
    try {
      const nextSuggestion = await generateDescriptionImpl({
        baseUrl: apiBaseUrl,
        productId: product.id,
        prompt: trimmedPrompt,
        allowBffFallback,
        fallbackBffBaseUrl,
      });
      setSuggestions((current) => [nextSuggestion, ...current]);
      setActiveSuggestion(nextSuggestion);
      setMessage("Generated a fresh AI suggestion.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate an AI description.");
    } finally {
      setIsGenerating(false);
    }
  }

  function approveSuggestion(): void {
    if (!activeSuggestion) return;
    setEditableDescription(activeSuggestion.description);
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.id === activeSuggestion.id ? { ...suggestion, status: "approved" } : suggestion,
      ),
    );
    setActiveSuggestion({ ...activeSuggestion, status: "approved" });
    setMessage("Suggestion approved and copied into the editor.");
    setError(null);
  }

  function rejectSuggestion(): void {
    if (!activeSuggestion) return;
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.id === activeSuggestion.id ? { ...suggestion, status: "rejected" } : suggestion,
      ),
    );
    setActiveSuggestion(undefined);
    setMessage("Suggestion rejected.");
    setError(null);
  }

  async function handleStartPublishWorkflow(): Promise<void> {
    setMessage(null);
    setError(null);
    setIsPublishing(true);
    try {
      const workflow = await startProductPublishImpl({
        baseUrl: apiBaseUrl,
        productId: product.id,
        description: editableDescription.trim() || undefined,
      });
      setPublishWorkflowId(workflow.id);
      setMessage("Publish workflow started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the publish workflow.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Admin content agent
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">AI Description Studio</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Generate, score, approve, reject, and edit AI-assisted product copy for {product.title}.
        </p>
      </header>

      {(error || message) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-6 rounded-md border p-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <label htmlFor="generation-prompt" className="text-sm font-semibold text-gray-900">
          Generation prompt
        </label>
        <textarea
          id="generation-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleGenerate()}
            className="cursor-pointer rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--color-brand-700)] disabled:cursor-wait disabled:bg-gray-300"
          >
            {isGenerating ? "Generating..." : "Generate description"}
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Description comparison">
        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Current description</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">
            {product.description || "No current description is set for this product."}
          </p>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-xl font-semibold">Generated suggestion</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {activeSuggestion?.source === "bff_fallback" ? "BFF fallback" : "Backend agent"}
            </span>
          </div>
          {activeSuggestion ? (
            <>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {activeSuggestion.description}
              </p>
              <div className="mt-5">
                <QualityScoreSummary score={activeSuggestion.qualityScore} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={approveSuggestion}
                  className="cursor-pointer rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-green-700"
                >
                  Approve suggestion
                </button>
                <button
                  type="button"
                  onClick={rejectSuggestion}
                  className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition-colors duration-200 hover:bg-gray-50"
                >
                  Reject suggestion
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600">
              No active AI suggestion. Generate a new description or review an existing suggestion
              when the backend provides one.
            </p>
          )}
        </article>
      </section>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <label htmlFor="editable-description" className="text-xl font-semibold">
          Editable description
        </label>
        <p className="mt-1 text-sm text-gray-600">
          Approving a suggestion copies it here. Operators can edit the copy before the backend
          publish workflow is wired in.
        </p>
        <textarea
          id="editable-description"
          value={editableDescription}
          onChange={(event) => setEditableDescription(event.target.value)}
          rows={8}
          className="mt-4 w-full rounded-md border border-gray-300 p-3 text-sm leading-6 text-gray-900 shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
        />
        <p className="mt-2 text-xs text-gray-500">
          {suggestions.length} AI suggestion{suggestions.length === 1 ? "" : "s"} loaded for this
          product.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isPublishing}
            onClick={() => void handleStartPublishWorkflow()}
            className="cursor-pointer rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[var(--color-brand-700)] disabled:cursor-wait disabled:bg-gray-300"
          >
            {isPublishing ? "Starting workflow..." : "Start publish workflow"}
          </button>
          {publishWorkflowId && (
            <Link
              href={`/admin/workflows/${publishWorkflowId}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              View workflow
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
