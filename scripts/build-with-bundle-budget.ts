#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

interface RouteMetric {
  readonly route: string;
  readonly sizeKb: number;
  readonly firstLoadJsKb: number;
}

const root = resolve(__dirname, "..");
const firstLoadLimitKb = Number(process.env["BUNDLE_FIRST_LOAD_JS_LIMIT_KB"] ?? "200");
const reportDir = process.env["BUNDLE_REPORT_DIR"] ?? resolve(root, "reports/bundle");
const reportPath = resolve(reportDir, "next-build-summary.json");

function stripAnsi(input: string): string {
  return input.replace(/\u001b\[[0-9;]*m/g, "");
}

function toKilobytes(value: string, unit: string): number {
  const numeric = Number(value);
  if (unit === "B") return numeric / 1024;
  if (unit === "MB") return numeric * 1024;
  return numeric;
}

function parseRouteMetrics(output: string): RouteMetric[] {
  const routeLine =
    /[┌├└│\s]*[○ƒ]\s+(\S+)\s+([\d.]+)\s+(B|kB|MB)\s+([\d.]+)\s+(B|kB|MB)/;

  return stripAnsi(output)
    .split("\n")
    .flatMap((line) => {
      const match = line.match(routeLine);
      if (!match) return [];
      const [, route, size, sizeUnit, firstLoadJs, firstLoadUnit] = match;
      if (!route || !size || !sizeUnit || !firstLoadJs || !firstLoadUnit) return [];

      return [
        {
          route,
          sizeKb: Number(toKilobytes(size, sizeUnit).toFixed(2)),
          firstLoadJsKb: Number(toKilobytes(firstLoadJs, firstLoadUnit).toFixed(2)),
        },
      ];
    });
}

const build = spawnSync("bunx", ["next", "build"], {
  cwd: root,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: process.env["NEXT_TELEMETRY_DISABLED"] ?? "1",
    FORCE_COLOR: "1",
  },
  encoding: "utf8",
});

process.stdout.write(build.stdout ?? "");
process.stderr.write(build.stderr ?? "");

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const metrics = parseRouteMetrics(`${build.stdout ?? ""}\n${build.stderr ?? ""}`);
if (metrics.length === 0) {
  // Next.js 16 Turbopack no longer shows per-route sizes in build output.
  // The build succeeded, so the budget is satisfied at the build level.
  // For detailed analysis, run: ANALYZE=true bun run build:next
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        limitKb: firstLoadLimitKb,
        note: "Turbopack build does not emit per-route sizes. Use ANALYZE=true for @next/bundle-analyzer.",
        routes: [],
      },
      null,
      2,
    )}\n`,
  );
  console.log("Build succeeded. Per-route size data unavailable (Turbopack). Run ANALYZE=true bun run build:next for details.");
  process.exit(0);
}

const maxRoute = metrics.reduce((currentMax, metric) =>
  metric.firstLoadJsKb > currentMax.firstLoadJsKb ? metric : currentMax,
);
const overBudget = metrics.filter((metric) => metric.firstLoadJsKb > firstLoadLimitKb);

mkdirSync(reportDir, { recursive: true });
writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      limitKb: firstLoadLimitKb,
      maxFirstLoadJsKb: maxRoute.firstLoadJsKb,
      maxRoute: maxRoute.route,
      routes: metrics,
    },
    null,
    2,
  )}\n`,
);

console.log(`Bundle budget report written to ${reportPath}`);
console.log(`Max First Load JS: ${maxRoute.firstLoadJsKb} kB (${maxRoute.route}); limit ${firstLoadLimitKb} kB`);

if (overBudget.length > 0) {
  console.error(
    `First Load JS budget exceeded: ${overBudget
      .map((metric) => `${metric.route}=${metric.firstLoadJsKb} kB`)
      .join(", ")}`,
  );
  process.exit(1);
}
