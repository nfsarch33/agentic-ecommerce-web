import { describe, expect, it } from "vitest";
import {
  availableActions,
  canTransition,
  isBillingCycle,
  isMembershipState,
  isMembershipTransition,
  isTerminalState,
  MembershipValidationError,
  nextState,
  parseMembershipState,
  stateLabel,
  stateTone,
  type MembershipState,
  type MembershipTransition,
} from "./membership";

describe("membership state predicates", () => {
  it.each(["trial", "active", "paused", "cancelled", "expired"] as const)(
    "isMembershipState accepts %s",
    (state) => {
      expect(isMembershipState(state)).toBe(true);
    },
  );

  it.each(["", "active ", "PAUSED", "unknown", null, 1])(
    "isMembershipState rejects %p",
    (value) => {
      expect(isMembershipState(value)).toBe(false);
    },
  );

  it("isTerminalState marks cancelled/expired", () => {
    expect(isTerminalState("cancelled")).toBe(true);
    expect(isTerminalState("expired")).toBe(true);
    expect(isTerminalState("active")).toBe(false);
    expect(isTerminalState("trial")).toBe(false);
    expect(isTerminalState("paused")).toBe(false);
  });

  it("parseMembershipState round-trips", () => {
    expect(parseMembershipState("trial")).toBe("trial");
  });

  it("parseMembershipState throws on invalid", () => {
    expect(() => parseMembershipState("nope")).toThrow(MembershipValidationError);
  });

  it("isMembershipTransition catches both names and bad values", () => {
    expect(isMembershipTransition("cancel")).toBe(true);
    expect(isMembershipTransition("expire")).toBe(true);
    expect(isMembershipTransition("foo")).toBe(false);
    expect(isMembershipTransition(null)).toBe(false);
  });

  it("isBillingCycle covers monthly and annual only", () => {
    expect(isBillingCycle("monthly")).toBe(true);
    expect(isBillingCycle("annual")).toBe(true);
    expect(isBillingCycle("weekly")).toBe(false);
  });
});

describe("transition table", () => {
  // Mirror of internal/domain/membership/state.go transitionTable.
  const legalTransitions: ReadonlyArray<{
    from: MembershipState;
    via: MembershipTransition;
    to: MembershipState;
  }> = [
    { from: "trial", via: "activate", to: "active" },
    { from: "trial", via: "cancel", to: "cancelled" },
    { from: "trial", via: "expire", to: "expired" },
    { from: "active", via: "pause", to: "paused" },
    { from: "active", via: "renew", to: "active" },
    { from: "active", via: "cancel", to: "cancelled" },
    { from: "active", via: "expire", to: "expired" },
    { from: "paused", via: "resume", to: "active" },
    { from: "paused", via: "cancel", to: "cancelled" },
  ];

  it.each(legalTransitions)(
    "$from -> $via -> $to",
    ({ from, via, to }) => {
      expect(canTransition(from, via)).toBe(true);
      expect(nextState(from, via)).toBe(to);
    },
  );

  it("terminal states reject every transition", () => {
    const allTransitions: readonly MembershipTransition[] = [
      "activate",
      "pause",
      "resume",
      "cancel",
      "expire",
      "renew",
    ];
    for (const terminal of ["cancelled", "expired"] as const) {
      for (const t of allTransitions) {
        expect(canTransition(terminal, t)).toBe(false);
        expect(() => nextState(terminal, t)).toThrow(MembershipValidationError);
      }
    }
  });

  it("active blocks resume (no idempotent resume from active)", () => {
    expect(canTransition("active", "resume")).toBe(false);
  });

  it("paused blocks renew and pause", () => {
    expect(canTransition("paused", "renew")).toBe(false);
    expect(canTransition("paused", "pause")).toBe(false);
  });

  it("trial blocks pause/renew (must activate first)", () => {
    expect(canTransition("trial", "pause")).toBe(false);
    expect(canTransition("trial", "renew")).toBe(false);
  });
});

describe("availableActions", () => {
  it("trial: cancel only (activate is system-driven)", () => {
    expect(availableActions("trial")).toEqual(["cancel"]);
  });

  it("active: pause + cancel", () => {
    expect(availableActions("active")).toEqual(["pause", "cancel"]);
  });

  it("paused: resume + cancel", () => {
    expect(availableActions("paused")).toEqual(["resume", "cancel"]);
  });

  it("cancelled / expired: no user actions", () => {
    expect(availableActions("cancelled")).toEqual([]);
    expect(availableActions("expired")).toEqual([]);
  });
});

describe("display helpers", () => {
  it("stateLabel covers all 5 states", () => {
    expect(stateLabel("trial")).toBe("Trial");
    expect(stateLabel("active")).toBe("Active");
    expect(stateLabel("paused")).toBe("Paused");
    expect(stateLabel("cancelled")).toBe("Cancelled");
    expect(stateLabel("expired")).toBe("Expired");
  });

  it("stateTone maps to severity tones", () => {
    expect(stateTone("active")).toBe("success");
    expect(stateTone("paused")).toBe("warning");
    expect(stateTone("cancelled")).toBe("danger");
    expect(stateTone("expired")).toBe("muted");
    expect(stateTone("trial")).toBe("info");
  });
});
