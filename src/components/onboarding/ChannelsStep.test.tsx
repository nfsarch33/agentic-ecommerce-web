// File scope: v3.9.1 Existing #10 ChannelsStep tests.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChannelsStep } from "./ChannelsStep";

describe("ChannelsStep", () => {
  it("submits the selected channels", () => {
    const onSubmit = vi.fn();
    render(<ChannelsStep onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId("onboarding-channel-tiktok"));
    fireEvent.click(screen.getByTestId("onboarding-channel-rednote"));
    fireEvent.click(screen.getByTestId("onboarding-channels-submit"));
    expect(onSubmit).toHaveBeenCalledWith({ channels: ["tiktok", "rednote"] });
  });

  it("disables submit when no channels are selected", () => {
    const onSubmit = vi.fn();
    render(<ChannelsStep onSubmit={onSubmit} />);
    const button = screen.getByTestId("onboarding-channels-submit") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("toggles selection on second click", () => {
    const onSubmit = vi.fn();
    render(<ChannelsStep onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId("onboarding-channel-tiktok"));
    fireEvent.click(screen.getByTestId("onboarding-channel-tiktok"));
    const button = screen.getByTestId("onboarding-channels-submit") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("preselects from initial prop", () => {
    const onSubmit = vi.fn();
    render(<ChannelsStep onSubmit={onSubmit} initial={{ channels: ["tiktok"] }} />);
    const checkbox = screen.getByTestId("onboarding-channel-tiktok") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
