import { describe, it, expect } from "vitest";
import { fleetBridgeUrl, MiniMaxFleetPolicyError, callDescribe } from "./ai-describe";

describe("fleetBridgeUrl", () => {
  it("returns the env value when set", () => {
    expect(fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "http://wsl1-travel:9091" })).toBe(
      "http://wsl1-travel:9091",
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

  it("rejects raw http://localhost — bridge MUST be on Tailscale", () => {
    expect(() => fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "http://localhost:9091" })).toThrow(
      MiniMaxFleetPolicyError,
    );
  });

  it("accepts Tailscale 100.x hosts", () => {
    expect(fleetBridgeUrl({ FLEET_AI_BRIDGE_URL: "http://100.119.5.1:9091" })).toBe(
      "http://100.119.5.1:9091",
    );
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
      { bridgeUrl: "http://wsl1-travel:9091", fetchImpl: mockFetch },
    );
    expect(out.description).toBe("A bouncy ball");
    expect(captured.url).toBe("http://wsl1-travel:9091/v1/describe");
    expect(captured.method).toBe("POST");
  });
});
