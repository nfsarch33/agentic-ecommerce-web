import type { UsageRollup } from "@/lib/domain/billing";
import { isOverBudget, usagePercent } from "@/lib/domain/billing";

export interface UsageProgressBarProps {
  readonly rollup: UsageRollup;
  readonly thresholdWarn?: number;
}

export function UsageProgressBar({ rollup, thresholdWarn = 0.8 }: UsageProgressBarProps) {
  const percent = usagePercent(rollup.value, rollup.limit);
  const warn = isOverBudget(rollup, thresholdWarn);
  const tone = warn ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div data-testid={`usage-${rollup.metric}`} className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-slate-700">{rollup.metric}</span>
        <span className="text-slate-600" data-testid={`usage-value-${rollup.metric}`}>
          {rollup.value} / {rollup.limit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-slate-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-full ${tone}`}
          style={{ width: `${percent}%` }}
          data-testid={`usage-bar-${rollup.metric}`}
        />
      </div>
    </div>
  );
}
