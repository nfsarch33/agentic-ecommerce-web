import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubscriptionStatusPill } from "./SubscriptionStatusPill";

describe("SubscriptionStatusPill", () => {
  it.each(["trialing", "active", "past_due", "paused", "canceled"] as const)(
    "renders %s",
    (state) => {
      render(<SubscriptionStatusPill state={state} />);
      expect(screen.getByTestId(`subscription-status-${state}`)).toBeInTheDocument();
    },
  );
});
