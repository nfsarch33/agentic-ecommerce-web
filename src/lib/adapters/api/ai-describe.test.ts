import { describe, it, expect } from "vitest";
import { fleetBridgeUrl, MiniMaxFleetPolicyError, callDescribe } from "./ai-describe";

describe("fleetBridgeUrl", () => {
  it("returns the env value when set", () => {
    expect(fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "http://node-1-travel:9091" })).toBe(
      "http://node-1-travel:9091",
    );
  });

  it("throws when FLEET_AI_BRIDGE_URL is missing", () => {
    expect(() => fleetBridgeUrl({})).toThrow(MiniMaxFleetPolicyError);
  });

  it("rejects api.minimaxi.com URLs (network policy)", () => {
    expect(() => fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "https://api.minimaxi.com/v1" })).toThrow(
      MiniMaxFleetPolicyError,
    );
  });

  it("rejects any *.minimaxi.com URL", () => {
    expect(() =>
      fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "https://embeddings.minimaxi.com/v1" }),
    ).toThrow(MiniMaxFleetPolicyError);
  });

  it("rejects raw http://localhost — bridge MUST be on fleet", () => {
    expect(() => fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "http://localhost:9091" })).toThrow(
      MiniMaxFleetPolicyError,
    );
  });

  it("accepts CGNAT 100.x hosts (RFC 6598 range)", () => {
    expect(fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "http://100.64.0.1:9091" })).toBe(
      "http://100.64.0.1:9091",
    );
  });

  it("accepts -travel fleet hostnames", () => {
    expect(fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "http://node-1-travel:9091" })).toBe(
      "http://node-1-travel:9091",
    );
  });

  it("accepts OCI .oraclecloud.com hostnames", () => {
    expect(
      fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "https://gw.host.oraclecloud.com" }),
    ).toBe("https://gw.host.oraclecloud.com");
  });

  it("accepts hosts listed in FLEET_ALLOWED_HOSTS", () => {
    for (const host of ["fleet-node-1", "fleet-node-2", "jump-host"]) {
      expect(
        fleetBridgeUrl({
          FLEET_AI_BRIDGE_URL: `http://${host}:9091`,
          FLEET_ALLOWED_HOSTS: "fleet-node-1,fleet-node-2,jump-host",
        }),
      ).toBe(`http://${host}:9091`);
    }
  });

  it("rejects bare 127.0.0.1 and ::1 loopback hosts", () => {
    expect(() => fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "http://127.0.0.1:9091" })).toThrow(
      MiniMaxFleetPolicyError,
    );
    expect(() => fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "http://[::1]:9091" })).toThrow(
      MiniMaxFleetPolicyError,
    );
  });

  it("rejects malformed URLs with a clear error", () => {
    expect(() => fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "not-a-url" })).toThrow(
      MiniMaxFleetPolicyError,
    );
  });

  it("rejects an empty FLEET_AI_BRIDGE_URL", () => {
    expect(() => fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "  " })).toThrow(
      /required and must point to a fleet node/,
    );
  });

  it("rejects arbitrary public hostnames not on the fleet allowlist", () => {
    expect(() =>
      fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "https://api.openai.com" }),
    ).toThrow(MiniMaxFleetPolicyError);
  });
});

describe("callDescribe", () => {
  it("POSTs to <bridge>/v1/describe with the prompt", async () => {
    const captured: Record<string, unknown> = {};
    const mockFetch: typeof fetch = async (input, init) => {
      captured.url = typeof input === "string" ? input : input.toString();
      captured.method = init?.method;
      captured.body = init?.body;
      return new Response(JSON.stringify({ description: "A bouncy ball" }), {
        headers: { "content-type": "application/json" },
      });
    };
    const out = await callDescribe(
      { prompt: "Describe a tennis ball", productId: "p_1" },
      { bridgeUrl: "http://node-1-travel:9091", fetchImpl: mockFetch },
    );
    expect(out.description).toBe("A bouncy ball");
    expect(captured.url).toBe("http://node-1-travel:9091/v1/describe");
    expect(captured.method).toBe("POST");
  });

  it("throws on non-2xx HTTP status with the status code in the message", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("err", { status: 502, headers: { "content-type": "text/plain" } });
    await expect(
      callDescribe(
        { prompt: "x", productId: "p_1" },
        { bridgeUrl: "http://node-1-travel:9091", fetchImpl: mockFetch },
      ),
    ).rejects.toThrow(/HTTP 502/);
  });

  it("rejects responses missing a description string", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    await expect(
      callDescribe(
        { prompt: "x", productId: "p_1" },
        { bridgeUrl: "http://node-1-travel:9091", fetchImpl: mockFetch },
      ),
    ).rejects.toThrow(/invalid response shape/);
  });

  it("rejects null JSON payloads as an invalid shape", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("null", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    await expect(
      callDescribe(
        { prompt: "x", productId: "p_1" },
        { bridgeUrl: "http://node-1-travel:9091", fetchImpl: mockFetch },
      ),
    ).rejects.toThrow(/invalid response shape/);
  });
});
