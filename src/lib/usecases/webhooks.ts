import {
  createWebhook,
  deleteWebhook,
  fetchWebhooks,
  sendTestWebhook,
  type CreateWebhookOptions,
  type DeleteWebhookOptions,
  type SendTestWebhookOptions,
  type WebhookApiOptions,
} from "@/lib/adapters/api/webhooks";
import {
  automationStatusesFromWebhooks,
  type AutomationStatus,
  type WebhookDelivery,
  type WebhookEventType,
  type WebhookRegistration,
} from "@/lib/domain/webhook";

export interface LoadWebhookSettingsInput {
  readonly baseUrl: string;
}

export interface LoadWebhookSettingsResult {
  readonly webhooks: readonly WebhookRegistration[];
  readonly automationStatuses: readonly AutomationStatus[];
}

export interface RegisterWebhookInput {
  readonly baseUrl: string;
  readonly url: string;
  readonly eventTypes: readonly WebhookEventType[];
  readonly description?: string;
  readonly secret?: string;
}

export interface DeleteWebhookRegistrationInput {
  readonly baseUrl: string;
  readonly webhookId: string;
}

export interface TestWebhookDeliveryInput {
  readonly baseUrl: string;
  readonly webhookId: string;
  readonly eventType: WebhookEventType;
}

export interface WebhookUsecaseDeps {
  readonly fetchWebhooksImpl?: (opts: WebhookApiOptions) => Promise<WebhookRegistration[]>;
  readonly createWebhookImpl?: (opts: CreateWebhookOptions) => Promise<WebhookRegistration>;
  readonly deleteWebhookImpl?: (opts: DeleteWebhookOptions) => Promise<void>;
  readonly sendTestWebhookImpl?: (opts: SendTestWebhookOptions) => Promise<WebhookDelivery>;
}

function requiredText(input: string, label: string): string {
  const value = input.trim();
  if (value === "") throw new Error(`${label} is required`);
  return value;
}

function optionalText(input: string | undefined): string | undefined {
  const value = input?.trim();
  return value ? value : undefined;
}

function requireEventTypes(eventTypes: readonly WebhookEventType[]): readonly WebhookEventType[] {
  if (eventTypes.length === 0) {
    throw new Error("at least one event type is required");
  }
  return eventTypes;
}

export async function loadWebhookSettings(
  input: LoadWebhookSettingsInput,
  deps: WebhookUsecaseDeps = {},
): Promise<LoadWebhookSettingsResult> {
  const impl = deps.fetchWebhooksImpl ?? fetchWebhooks;
  const webhooks = await impl({ baseUrl: input.baseUrl });
  return {
    webhooks,
    automationStatuses: automationStatusesFromWebhooks(webhooks),
  };
}

export async function registerWebhook(
  input: RegisterWebhookInput,
  deps: WebhookUsecaseDeps = {},
): Promise<WebhookRegistration> {
  const impl = deps.createWebhookImpl ?? createWebhook;
  return impl({
    baseUrl: input.baseUrl,
    url: requiredText(input.url, "url"),
    eventTypes: requireEventTypes(input.eventTypes),
    description: optionalText(input.description),
    secret: optionalText(input.secret),
  });
}

export async function deleteWebhookRegistration(
  input: DeleteWebhookRegistrationInput,
  deps: WebhookUsecaseDeps = {},
): Promise<void> {
  const impl = deps.deleteWebhookImpl ?? deleteWebhook;
  return impl({
    baseUrl: input.baseUrl,
    webhookId: requiredText(input.webhookId, "webhookId"),
  });
}

export async function testWebhookDelivery(
  input: TestWebhookDeliveryInput,
  deps: WebhookUsecaseDeps = {},
): Promise<WebhookDelivery> {
  const impl = deps.sendTestWebhookImpl ?? sendTestWebhook;
  return impl({
    baseUrl: input.baseUrl,
    webhookId: requiredText(input.webhookId, "webhookId"),
    eventType: input.eventType,
  });
}
