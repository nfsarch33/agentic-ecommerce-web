"use client";

import { useState } from "react";
import { ALLOWED_CHANNELS, type WizardChannels } from "@/lib/domain/onboarding-wizard";

export interface ChannelsStepProps {
  readonly initial?: WizardChannels;
  readonly onSubmit: (ch: WizardChannels) => Promise<void> | void;
  readonly disabled?: boolean;
}

export function ChannelsStep({ initial, onSubmit, disabled }: ChannelsStepProps) {
  const [selected, setSelected] = useState<readonly string[]>(initial?.channels ?? []);

  function toggle(channel: string): void {
    setSelected((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  }

  return (
    <form
      data-testid="onboarding-step-channels"
      className="space-y-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.length === 0) return;
        void onSubmit({ channels: selected });
      }}
    >
      <h2 className="text-base font-semibold text-gray-900">Step 2 of 4 -- Channel connections</h2>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-slate-700">Select channels to enable</legend>
        {ALLOWED_CHANNELS.map((channel) => (
          <label key={channel} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(channel)}
              onChange={() => toggle(channel)}
              data-testid={`onboarding-channel-${channel}`}
              className="rounded border-slate-300"
            />
            <span className="text-slate-700">{channel}</span>
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        disabled={disabled || selected.length === 0}
        data-testid="onboarding-channels-submit"
        className="inline-flex w-full justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        Save channels and continue
      </button>
    </form>
  );
}
