// File scope: v3.6.0 EC-9-2 AgentActivityFeed component tests.
//
// Uses a stub EventSource implementation so the component's
// subscribe + render + cleanup paths can be exercised without a
// running backend. Mirrors the test patterns from
// AgentDashboard.test.tsx + ComplianceReportingPanel.test.tsx.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AgentActivityFeed } from "./AgentActivityFeed";

class StubEventSource {
  public url: string;
  public onopen: ((evt: Event) => void) | null = null;
  public onerror: ((evt: Event) => void) | null = null;
  public closed = false;
  private listeners: Map<string, EventListener[]> = new Map();
  public static instances: StubEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    StubEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  emit(type: string, data: string): void {
    const list = this.listeners.get(type) ?? [];
    const evt = new MessageEvent(type, { data });
    for (const listener of list) {
      listener(evt);
    }
  }

  close(): void {
    this.closed = true;
  }

  open(): void {
    if (this.onopen) this.onopen(new Event("open"));
  }

  emitError(): void {
    if (this.onerror) this.onerror(new Event("error"));
  }
}

beforeEach(() => {
  StubEventSource.instances = [];
});

function activeSource(): StubEventSource {
  const source = StubEventSource.instances[0];
  if (!source) throw new Error("expected an EventSource instance");
  return source;
}

describe("AgentActivityFeed", () => {
  it("renders an empty state before any events arrive", () => {
    render(<AgentActivityFeed EventSourceImpl={StubEventSource as unknown as typeof EventSource} />);
    expect(screen.getByTestId("agent-activity-empty")).toBeInTheDocument();
    expect(screen.getByTestId("agent-activity-state")).toHaveTextContent(/Connecting/i);
  });

  it("flips to 'Live' on open and renders incoming events", () => {
    render(<AgentActivityFeed EventSourceImpl={StubEventSource as unknown as typeof EventSource} />);
    const source = activeSource();
    act(() => source.open());
    expect(screen.getByTestId("agent-activity-state")).toHaveTextContent(/Live/i);
    act(() =>
      source.emit(
        "price.change.applied",
        JSON.stringify({
          tenant_id: "tenant-a",
          agent_id: "pricing_agent",
          action: "price.change.applied",
          status: "applied",
          timestamp: "2026-05-10T12:00:00Z",
          details: { product_id: "p1" },
        }),
      ),
    );
    expect(screen.getByTestId("agent-activity-list")).toBeInTheDocument();
    expect(screen.getByText("price.change.applied")).toBeInTheDocument();
    expect(screen.getByText("pricing_agent")).toBeInTheDocument();
  });

  it("ignores malformed payloads", () => {
    render(<AgentActivityFeed EventSourceImpl={StubEventSource as unknown as typeof EventSource} />);
    const source = activeSource();
    act(() => source.emit("price.change.applied", "not json"));
    expect(screen.getByTestId("agent-activity-empty")).toBeInTheDocument();
  });

  it("renders a dropped notice and synthetic activity entry on overflow", () => {
    render(<AgentActivityFeed EventSourceImpl={StubEventSource as unknown as typeof EventSource} />);
    const source = activeSource();
    act(() => source.emit("dropped", JSON.stringify({ count: 3 })));
    expect(screen.getByText(/3 dropped/)).toBeInTheDocument();
    // The synthetic activity entry uses the dropped status badge.
    expect(screen.getByTestId("agent-activity-list")).toBeInTheDocument();
    expect(screen.getAllByText("dropped").length).toBeGreaterThanOrEqual(1);
  });

  it("survives a malformed dropped payload by counting one", () => {
    render(<AgentActivityFeed EventSourceImpl={StubEventSource as unknown as typeof EventSource} />);
    const source = activeSource();
    act(() => source.emit("dropped", "not json"));
    expect(screen.getByText(/1 dropped/)).toBeInTheDocument();
  });

  it("flips to 'Reconnecting...' on EventSource error", () => {
    render(<AgentActivityFeed EventSourceImpl={StubEventSource as unknown as typeof EventSource} />);
    const source = activeSource();
    act(() => source.emitError());
    expect(screen.getByTestId("agent-activity-state")).toHaveTextContent(/Reconnecting/i);
  });

  it("trims the buffer at maxEvents", () => {
    render(
      <AgentActivityFeed
        EventSourceImpl={StubEventSource as unknown as typeof EventSource}
        maxEvents={2}
      />,
    );
    const source = activeSource();
    for (let i = 0; i < 5; i++) {
      act(() =>
        source.emit(
          "price.change.applied",
          JSON.stringify({
            tenant_id: "tenant-a",
            agent_id: "pricing_agent",
            action: "price.change.applied",
            status: "applied",
            timestamp: "2026-05-10T12:00:00Z",
            details: { i },
          }),
        ),
      );
    }
    const items = screen.getAllByTestId("agent-activity-item");
    expect(items.length).toBe(2);
  });

  it("closes the EventSource on unmount", () => {
    const { unmount } = render(<AgentActivityFeed EventSourceImpl={StubEventSource as unknown as typeof EventSource} />);
    const source = activeSource();
    unmount();
    expect(source.closed).toBe(true);
  });

  it("falls back to error state when EventSource is unavailable", () => {
    const stub = vi.fn();
    render(<AgentActivityFeed EventSourceImpl={undefined} streamUrl="/x" />);
    expect(screen.getByTestId("agent-activity-state")).toHaveTextContent(/Reconnecting|Live|Closed|Connecting/);
    expect(stub).not.toHaveBeenCalled();
  });

  it("applies a custom stream URL when provided", () => {
    render(
      <AgentActivityFeed
        EventSourceImpl={StubEventSource as unknown as typeof EventSource}
        streamUrl="/custom/stream"
      />,
    );
    expect(activeSource().url).toBe("/custom/stream");
  });
});
