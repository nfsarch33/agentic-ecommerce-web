// Adapter: MiniMax-routed AI description.
//
// HARD NETWORK POLICY: this app NEVER calls api.minimaxi.com directly.
// All MiniMax traffic is proxied through the Tailscale fleet bridge
// (minimax-openai-bridge running on wsl1 / OCI). The url validator
// below refuses any *.minimaxi.com host or non-Tailscale localhost
// fallback so a misconfigured deploy fails loud at request time.

const TAILSCALE_HOST_PREFIX = "100.";

export class MiniMaxFleetPolicyError extends Error {
  override readonly name = "MiniMaxFleetPolicyError";
}

export interface FleetEnv {
  readonly FLEET_AI_BRIDGE_URL?: string;
}

export function fleetBridgeUrl(env: FleetEnv): string {
  const raw = env.FLEET_AI_BRIDGE_URL?.trim() ?? "";
  if (raw === "") {
    throw new MiniMaxFleetPolicyError("FLEET_AI_BRIDGE_URL is required and must point to a fleet node");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new MiniMaxFleetPolicyError(`FLEET_AI_BRIDGE_URL is not a valid URL`);
  }
  const host = url.hostname.toLowerCase();
  if (host === "api.minimaxi.com" || host.endsWith(".minimaxi.com")) {
    throw new MiniMaxFleetPolicyError(
      "MiniMax direct hosts are forbidden; use the Tailscale fleet bridge instead",
    );
  }
  // Reject loopback to prevent accidental "developer ran the bridge on
  // localhost". The bridge MUST be on a fleet node reachable via
  // Tailscale 100.x, OCI public IP, or a fleet hostname alias.
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    throw new MiniMaxFleetPolicyError(
      "FLEET_AI_BRIDGE_URL must NOT point to localhost; bridge runs on the fleet (Tailscale)",
    );
  }
  // Tailscale (100.x) hosts pass; we also allow private fleet hostnames.
  // The whitelist intentionally errs on the conservative side.
  const looksFleet =
    host.startsWith(TAILSCALE_HOST_PREFIX) ||
    host.endsWith("-travel") ||
    host.endsWith(".oraclecloud.com") ||
    host === "wsl1" ||
    host === "win1" ||
    host === "oracle-jump";
  if (!looksFleet) {
    throw new MiniMaxFleetPolicyError(
      `FLEET_AI_BRIDGE_URL host ${host} is not on the approved fleet allowlist (Tailscale 100.x, *-travel, OCI)`,
    );
  }
  return raw;
}

export interface DescribeInput {
  readonly prompt: string;
  readonly productId: string;
}

export interface DescribeOutput {
  readonly description: string;
}

export interface CallDescribeOptions {
  readonly bridgeUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

export async function callDescribe(
  input: DescribeInput,
  opts: CallDescribeOptions,
): Promise<DescribeOutput> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${opts.bridgeUrl}/v1/describe`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input),
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`callDescribe: HTTP ${res.status}`);
  }
  const raw: unknown = await res.json();
  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as { description?: unknown }).description !== "string"
  ) {
    throw new Error("callDescribe: invalid response shape");
  }
  return { description: (raw as { description: string }).description };
}
