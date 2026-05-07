import { describe, expect, it } from "vitest";
import {
  eventSeverityTone,
  eventTypeLabel,
  filterEventsByType,
  type EventItem,
} from "./event";

const sampleEvents: EventItem[] = [
  {
    id: "evt_1",
    type: "product.created",
    severity: "info",
    message: "Product created: Wireless Earbuds",
    occurredAt: "2026-05-07T04:00:00Z",
  },
  {
    id: "evt_2",
    type: "order.placed",
    severity: "info",
    message: "Order #1042 placed",
    occurredAt: "2026-05-07T04:01:00Z",
  },
  {
    id: "evt_3",
    type: "compliance.checked",
    severity: "warning",
    message: "Compliance warning on product SKU-100",
    occurredAt: "2026-05-07T04:02:00Z",
    metadata: { productId: "prod_100", ruleId: "seo-min-length" },
  },
  {
    id: "evt_4",
    type: "agent.run.completed",
    severity: "error",
    message: "Sourcing agent failed: timeout",
    occurredAt: "2026-05-07T04:03:00Z",
  },
];

describe("eventTypeLabel", () => {
  it("returns a human-readable label for each event type", () => {
    expect(eventTypeLabel("product.created")).toBe("Product Created");
    expect(eventTypeLabel("order.placed")).toBe("Order Placed");
    expect(eventTypeLabel("sync.completed")).toBe("Sync Completed");
    expect(eventTypeLabel("agent.run.completed")).toBe("Agent Run Completed");
    expect(eventTypeLabel("compliance.checked")).toBe("Compliance Checked");
    expect(eventTypeLabel("product.updated")).toBe("Product Updated");
  });
});

describe("eventSeverityTone", () => {
  it("maps severity to the correct visual tone", () => {
    expect(eventSeverityTone("info")).toBe("gray");
    expect(eventSeverityTone("warning")).toBe("amber");
    expect(eventSeverityTone("error")).toBe("red");
  });
});

describe("filterEventsByType", () => {
  it("returns only events matching the given type", () => {
    const filtered = filterEventsByType(sampleEvents, "compliance.checked");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("evt_3");
  });

  it("returns an empty array when no events match", () => {
    expect(filterEventsByType(sampleEvents, "sync.completed")).toHaveLength(0);
  });

  it("preserves all matching events when there are multiple", () => {
    const doubled = [...sampleEvents, { ...sampleEvents[0]!, id: "evt_5" }];
    const filtered = filterEventsByType(doubled, "product.created");
    expect(filtered).toHaveLength(2);
  });
});
