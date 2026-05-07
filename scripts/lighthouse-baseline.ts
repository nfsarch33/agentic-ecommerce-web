#!/usr/bin/env bun
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(__dirname, "..");
const url = process.env["LIGHTHOUSE_URL"] ?? "http://127.0.0.1:3000/admin";
const outputDir = process.env["LIGHTHOUSE_OUTPUT_DIR"] ?? resolve(root, "reports/lighthouse");
const chromeFlags = process.env["LIGHTHOUSE_CHROME_FLAGS"] ?? "--headless=new --no-sandbox";

mkdirSync(outputDir, { recursive: true });

const baseArgs = [
  "lighthouse",
  url,
  "--quiet",
  "--only-categories=performance,accessibility,best-practices,seo",
  `--chrome-flags=${chromeFlags}`,
  "--output=json",
  "--output=html",
  `--output-path=${resolve(outputDir, "baseline")}`,
];

execFileSync("bunx", baseArgs, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
