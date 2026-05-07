import {
  fetchRecentEvents,
  type FetchRecentEventsOptions,
} from "@/lib/adapters/api/events";
import type { EventItem } from "@/lib/domain/event";

export interface ListRecentEventsInput {
  readonly baseUrl: string;
  readonly limit?: number;
}

export interface EventUsecaseDeps {
  readonly fetchRecentEventsImpl?: (opts: FetchRecentEventsOptions) => Promise<EventItem[]>;
}

export async function listRecentEvents(
  input: ListRecentEventsInput,
  deps: EventUsecaseDeps = {},
): Promise<EventItem[]> {
  const impl = deps.fetchRecentEventsImpl ?? fetchRecentEvents;
  return impl({ baseUrl: input.baseUrl, limit: input.limit });
}
