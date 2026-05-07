#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

interface LighthouseCategory {
  readonly score: number | null;
}

interface LighthouseReport {
  readonly requestedUrl: string;
  readonly finalDisplayedUrl?: string;
  readonly categories: Record<string, LighthouseCategory>;
}

const root = resolve(__dirname, "..");
const url = process.env["LIGHTHOUSE_URL"] ?? "http://127.0.0.1:3000/";
const outputDir = process.env["LIGHTHOUSE_OUTPUT_DIR"] ?? resolve(root, "reports/lighthouse");
const outputName = process.env["LIGHTHOUSE_OUTPUT_NAME"] ?? "v180-audit";
const outputPath = resolve(outputDir, outputName);
const chromeFlags = process.env["LIGHTHOUSE_CHROME_FLAGS"] ?? "--headless=new --no-sandbox";

const thresholds: Record<string, number> = {
  performance: Number(process.env["LIGHTHOUSE_PERFORMANCE_MIN"] ?? "90"),
  accessibility: Number(process.env["LIGHTHOUSE_ACCESSIBILITY_MIN"] ?? "90"),
  "best-practices": Number(process.env["LIGHTHOUSE_BEST_PRACTICES_MIN"] ?? "90"),
  seo: Number(process.env["LIGHTHOUSE_SEO_MIN"] ?? "90"),
};

mkdirSync(outputDir, { recursive: true });

const run = spawnSync(
  "bunx",
  [
    "lighthouse",
    url,
    "--quiet",
    "--only-categories=performance,accessibility,best-practices,seo",
    `--chrome-flags=${chromeFlags}`,
    "--output=json",
    "--output=html",
    `--output-path=${outputPath}`,
  ],
  {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  },
);

process.stdout.write(run.stdout ?? "");
process.stderr.write(run.stderr ?? "");

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

const jsonReportPath = [`${outputPath}.report.json`, `${outputPath}.json`].find((candidate) => existsSync(candidate));
if (!jsonReportPath) {
  console.error(`Could not find Lighthouse JSON report for ${outputPath}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(jsonReportPath, "utf8")) as LighthouseReport;
const scores = Object.fromEntries(
  Object.keys(thresholds).map((category) => {
    const score = report.categories[category]?.score;
    return [category, score == null ? null : Math.round(score * 100)];
  }),
);

const summaryPath = resolve(outputDir, `${outputName}-summary.json`);
writeFileSync(
  summaryPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      requestedUrl: report.requestedUrl,
      finalDisplayedUrl: report.finalDisplayedUrl,
      thresholds,
      scores,
      reportPath: jsonReportPath,
    },
    null,
    2,
  )}\n`,
);

console.log(`Lighthouse summary written to ${summaryPath}`);
console.log(`Lighthouse scores: ${Object.entries(scores).map(([name, score]) => `${name}=${score}`).join(", ")}`);

const failures = Object.entries(thresholds).filter(([category, threshold]) => {
  const score = scores[category];
  return typeof score !== "number" || score < threshold;
});

if (failures.length > 0) {
  console.error(
    `Lighthouse thresholds failed: ${failures
      .map(([category, threshold]) => `${category} ${scores[category] ?? "missing"} < ${threshold}`)
      .join(", ")}`,
  );
  process.exit(1);
}
