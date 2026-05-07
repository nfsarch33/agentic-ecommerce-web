import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventActivityFeed } from "./EventActivityFeed";
import type { EventItem } from "@/lib/domain/event";

const sampleEvents: EventItem[] = [
  {
    id: "evt_1",
    type: "product.created",
    severity: "info",
    message: "Product created: Wireless Earbuds",
    occurredAt: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: "evt_2",
    type: "compliance.checked",
    severity: "warning",
    message: "SEO title too short on SKU-100",
    occurredAt: new Date(Date.now() - 300_000).toISOString(),
  },
  {
    id: "evt_3",
    type: "agent.run.completed",
    severity: "error",
    message: "Sourcing agent failed: connection timeout",
    occurredAt: new Date(Date.now() - 7200_000).toISOString(),
  },
];

describe("EventActivityFeed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders heading and empty state when no events", async () => {
    const listEventsImpl = vi.fn().mockResolvedValue([]);

    render(
      <EventActivityFeed apiBaseUrl="http://api.test" listEventsImpl={listEventsImpl} />,
    );

    expect(screen.getByRole("heading", { name: "Recent Activity" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/no recent events/i)).toBeInTheDocument();
    });
  });

  it("renders event items with type labels and messages", async () => {
    const listEventsImpl = vi.fn().mockResolvedValue(sampleEvents);

    render(
      <EventActivityFeed apiBaseUrl="http://api.test" listEventsImpl={listEventsImpl} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Product Created")).toBeInTheDocument();
    });
    expect(screen.getByText("Product created: Wireless Earbuds")).toBeInTheDocument();
    expect(screen.getByText("Compliance Checked")).toBeInTheDocument();
    expect(screen.getByText("SEO title too short on SKU-100")).toBeInTheDocument();
    expect(screen.getByText("Agent Run Completed")).toBeInTheDocument();
  });

  it("displays error alert when polling fails", async () => {
    const listEventsImpl = vi.fn().mockRejectedValue(new Error("server unreachable"));

    render(
      <EventActivityFeed apiBaseUrl="http://api.test" listEventsImpl={listEventsImpl} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("server unreachable");
    });
  });

  it("renders a list role containing event items", async () => {
    const listEventsImpl = vi.fn().mockResolvedValue(sampleEvents);

    render(
      <EventActivityFeed apiBaseUrl="http://api.test" listEventsImpl={listEventsImpl} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("list")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("passes custom limit to the polling hook", async () => {
    const listEventsImpl = vi.fn().mockResolvedValue([]);

    render(
      <EventActivityFeed
        apiBaseUrl="http://api.test"
        limit={5}
        listEventsImpl={listEventsImpl}
      />,
    );

    await waitFor(() =>
      expect(listEventsImpl).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 }),
      ),
    );
  });

  it("contains the section landmark with appropriate label", async () => {
    const listEventsImpl = vi.fn().mockResolvedValue([]);

    render(
      <EventActivityFeed apiBaseUrl="http://api.test" listEventsImpl={listEventsImpl} />,
    );

    expect(
      screen.getByRole("region", { name: "Event activity feed" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/no recent events/i)).toBeInTheDocument();
    });
  });
});
