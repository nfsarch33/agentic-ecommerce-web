import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsSkeleton } from "./SettingsSkeleton";

describe("SettingsSkeleton", () => {
  it("renders config sections without exposing secret values", () => {
    render(
      <SettingsSkeleton
        sections={[
          { name: "API", status: "configured", description: "Backend API base URL is configured." },
          { name: "WooCommerce", status: "not_configured", description: "Credentials must remain server-side." },
          {
            name: "Agents",
            status: "configured",
            description: "Agent scheduler endpoint is configured.",
            href: "/admin/settings/agents",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText("WooCommerce")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Agents" })).toHaveAttribute("href", "/admin/settings/agents");
    expect(screen.getByText(/credentials must remain server-side/i)).toBeInTheDocument();
    expect(screen.queryByText(/secret/i)).not.toBeInTheDocument();
  });
});
