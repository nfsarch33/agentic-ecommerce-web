"use client";

import { useMemo, useState } from "react";
import {
  deleteWebhookRegistration,
  registerWebhook,
  testWebhookDelivery,
  type DeleteWebhookRegistrationInput,
  type RegisterWebhookInput,
  type TestWebhookDeliveryInput,
} from "@/lib/usecases/webhooks";
import {
  automationStatusLabel,
  automationStatusesFromWebhooks,
  automationStatusTone,
  supportedWebhookEventTypes,
  webhookDeliveryStatusLabel,
  webhookEventTypeLabel,
  webhookStatusTone,
  type AutomationStatus,
  type StatusTone,
  type WebhookDelivery,
  type WebhookEventType,
  type WebhookRegistration,
} from "@/lib/domain/webhook";

export interface WebhookManagementProps {
  readonly apiBaseUrl?: string;
  readonly webhooks: readonly WebhookRegistration[];
  readonly automationStatuses: readonly AutomationStatus[];
  readonly createWebhookImpl?: (input: RegisterWebhookInput) => Promise<WebhookRegistration>;
  readonly deleteWebhookImpl?: (input: DeleteWebhookRegistrationInput) => Promise<void>;
  readonly sendTestWebhookImpl?: (input: TestWebhookDeliveryInput) => Promise<WebhookDelivery>;
}

const toneClasses: Record<StatusTone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
};

const eventOptions = supportedWebhookEventTypes.filter((eventType) =>
  ["product.approved", "order.placed", "product.created", "product.updated", "compliance.checked"].includes(eventType),
);

function StatusBadge({ label, tone }: { readonly label: string; readonly tone: StatusTone }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${toneClasses[tone]}`}>{label}</span>;
}

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return "No deliveries yet";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function webhookTitle(webhook: WebhookRegistration): string {
  return webhook.description ?? webhook.url;
}

export function WebhookManagement({
  apiBaseUrl = "",
  webhooks,
  automationStatuses,
  createWebhookImpl = registerWebhook,
  deleteWebhookImpl = deleteWebhookRegistration,
  sendTestWebhookImpl = testWebhookDelivery,
}: WebhookManagementProps) {
  const [items, setItems] = useState<readonly WebhookRegistration[]>(webhooks);
  const [statuses, setStatuses] = useState<readonly AutomationStatus[]>(automationStatuses);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<readonly WebhookEventType[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasWebhooks = items.length > 0;
  const statusSummary = useMemo(
    () => statuses.map((status) => ({ ...status, label: automationStatusLabel(status.status) })),
    [statuses],
  );

  function updateItems(nextItems: readonly WebhookRegistration[]): void {
    setItems(nextItems);
    setStatuses(automationStatusesFromWebhooks(nextItems));
  }

  function toggleEvent(eventType: WebhookEventType): void {
    setSelectedEvents((current) =>
      current.includes(eventType) ? current.filter((candidate) => candidate !== eventType) : [...current, eventType],
    );
  }

  async function handleRegister(): Promise<void> {
    setMessage(null);
    setError(null);
    if (url.trim() === "") {
      setError("Destination URL is required.");
      return;
    }
    if (selectedEvents.length === 0) {
      setError("Select at least one event type.");
      return;
    }

    setIsSubmitting(true);
    try {
      const webhook = await createWebhookImpl({
        baseUrl: apiBaseUrl,
        url,
        eventTypes: selectedEvents,
        description,
        secret,
      });
      updateItems([webhook, ...items]);
      setUrl("");
      setDescription("");
      setSecret("");
      setSelectedEvents([]);
      setMessage("Webhook registered.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register webhook.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(webhook: WebhookRegistration): Promise<void> {
    setMessage(null);
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteWebhookImpl({ baseUrl: apiBaseUrl, webhookId: webhook.id });
      updateItems(items.filter((item) => item.id !== webhook.id));
      setMessage("Webhook deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete webhook.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendTest(webhook: WebhookRegistration): Promise<void> {
    setMessage(null);
    setError(null);
    const eventType = webhook.eventTypes[0];
    if (!eventType) {
      setError("Webhook has no event types to test.");
      return;
    }
    setIsSubmitting(true);
    try {
      const delivery = await sendTestWebhookImpl({ baseUrl: apiBaseUrl, webhookId: webhook.id, eventType });
      setMessage(`Test delivery ${webhookDeliveryStatusLabel(delivery.status).toLowerCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send test webhook.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">n8n automation bridge</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Webhooks</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Register outbound webhook destinations for backend events, then connect those endpoints to n8n HTTP trigger
          workflows for notifications and fulfilment automation.
        </p>
      </header>

      {(message || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`mb-6 rounded-md border p-4 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Example automation status</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {statusSummary.map((status) => (
            <article key={status.id} className="rounded-md border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-gray-950">{status.name}</h3>
                <StatusBadge label={status.label} tone={automationStatusTone(status.status)} />
              </div>
              <p className="mt-2 text-sm text-gray-600">{status.description}</p>
              <p className="mt-3 text-xs text-gray-500">
                Event: {webhookEventTypeLabel(status.eventType)} · Target: {status.target}
              </p>
              <p className="mt-1 text-xs text-gray-500">Last delivery: {formatTimestamp(status.lastDeliveryAt)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Register webhook</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label htmlFor="webhook-destination-url" className="text-sm font-semibold text-gray-900">
              Destination URL
            </label>
            <input
              id="webhook-destination-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://hooks.n8n.example/webhook/product-approved"
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="webhook-description" className="text-sm font-semibold text-gray-900">
              Description
            </label>
            <input
              id="webhook-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Product approval Slack alert"
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="webhook-signing-secret" className="text-sm font-semibold text-gray-900">
              Signing secret
            </label>
            <input
              id="webhook-signing-secret"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm"
            />
            <p className="mt-2 text-xs text-gray-500">Stored by the backend for HMAC signing and never returned.</p>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-gray-900">Events</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eventOptions.map((eventType) => (
              <label key={eventType} className="flex items-center gap-3 rounded-md border border-gray-200 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(eventType)}
                  onChange={() => toggleEvent(eventType)}
                  className="size-4 rounded border-gray-300"
                />
                {webhookEventTypeLabel(eventType)}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleRegister()}
          className="mt-5 rounded-md bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
        >
          {isSubmitting ? "Registering..." : "Register webhook"}
        </button>
      </section>

      <section aria-label="Registered webhooks">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Registered webhooks</h2>
            <p className="mt-1 text-sm text-gray-600">Showing {items.length} outbound webhook destination(s).</p>
          </div>
        </div>

        {!hasWebhooks ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900">No webhooks registered</h3>
            <p className="mt-2 text-sm text-gray-600">
              Add an n8n HTTP trigger URL to start receiving product and order automation events.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {items.map((webhook) => (
              <article
                key={webhook.id}
                aria-label={webhookTitle(webhook)}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-950">{webhookTitle(webhook)}</h3>
                  <StatusBadge
                    label={webhook.active ? "Active" : "Paused"}
                    tone={webhookStatusTone(webhook)}
                  />
                </div>
                <p className="mt-3 break-all text-sm text-gray-700">{webhook.url}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {webhook.eventTypes.map((eventType) => (
                    <StatusBadge key={eventType} label={webhookEventTypeLabel(eventType)} tone="blue" />
                  ))}
                </div>
                <dl className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-gray-900">HMAC secret</dt>
                    <dd>{webhook.secretConfigured ? "Configured" : "Not configured"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Failures</dt>
                    <dd>{webhook.failureCount ?? 0}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-900">Last delivery</dt>
                    <dd>{formatTimestamp(webhook.lastDeliveryAt)}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleSendTest(webhook)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 disabled:text-gray-400"
                  >
                    Send test
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleDelete(webhook)}
                    className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:text-gray-400"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
