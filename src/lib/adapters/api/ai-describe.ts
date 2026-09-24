// Adapter: MiniMax-routed AI description.
//
// HARD NETWORK POLICY: this app NEVER calls api.minimaxi.com directly.
// All MiniMax traffic is proxied through the fleet bridge
// (minimax-openai-bridge on a fleet node). The url validator
// below refuses any *.minimaxi.com host or loopback so a misconfigured
// deploy fails loud at request time.

export class MiniMaxFleetPolicyError extends Error {
  override readonly name = "MiniMaxFleetPolicyError";
}

export interface FleetEnv {
  readonly FLEET_AI_BRIDGE_URL?: string;
  // Comma-separated extra bridge host names (fleet aliases). Loopback names
  // and addresses listed here are never accepted: the loopback check runs
  // before the allowlist.
  readonly FLEET_ALLOWED_HOSTS?: string;
}

// WHATWG URL keeps the brackets on an IPv6 hostname ("[::1]"); compare the
// bare address.
function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function isLoopback(host: string): boolean {
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.startsWith("127.") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "::"
  );
}

// RFC 6598 shared address space (the CGNAT /10): an address-range check, not a
// string prefix, so a host name that merely starts with "100." and an address
// outside that /10 do not pass as fleet.
function isCgnat(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b, c, d] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if ([a, b, c, d].some((o) => Number.isNaN(o) || o > 255)) return false;
  return a === 100 && b >= 64 && b <= 127;
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
  const host = bareHost(url.hostname);
  if (host === "api.minimaxi.com" || host.endsWith(".minimaxi.com")) {
    throw new MiniMaxFleetPolicyError(
      "MiniMax direct hosts are forbidden; use the fleet bridge instead",
    );
  }
  if (isLoopback(host)) {
    throw new MiniMaxFleetPolicyError(
      "FLEET_AI_BRIDGE_URL must NOT point to localhost; bridge runs on a fleet node",
    );
  }
  const extraHosts = (env.FLEET_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const looksFleet =
    isCgnat(host) ||
    host.endsWith("-travel") ||
    host.endsWith(".oraclecloud.com") ||
    extraHosts.includes(host);
  if (!looksFleet) {
    throw new MiniMaxFleetPolicyError(
      `FLEET_AI_BRIDGE_URL host ${host} is not on the approved fleet allowlist (CGNAT shared address space, *-travel, OCI, or FLEET_ALLOWED_HOSTS)`,
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
