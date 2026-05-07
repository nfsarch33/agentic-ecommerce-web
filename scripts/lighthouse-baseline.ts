#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

execFileSync("bun", ["run", "scripts/lighthouse-audit.ts"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    LIGHTHOUSE_OUTPUT_NAME: process.env["LIGHTHOUSE_OUTPUT_NAME"] ?? "baseline",
  },
});
