#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

interface GateResult {
  readonly name: string;
  readonly status: "passed" | "failed" | "skipped";
  readonly command?: string;
}

const root = resolve(__dirname, "..");
const reportDir = process.env["SECURITY_REPORT_DIR"] ?? resolve(root, "reports/security");
const results: GateResult[] = [];

function commandExists(command: string): boolean {
  return spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0;
}

function runGate(name: string, command: string, args: string[], required = true): void {
  if (!commandExists(command)) {
    results.push({ name, status: required ? "failed" : "skipped", command: [command, ...args].join(" ") });
    if (required) console.error(`${name} failed: ${command} is not installed`);
    else console.warn(`${name} skipped: ${command} is not installed`);
    return;
  }

  const displayCommand = [command, ...args].join(" ");
  console.log(`\n$ ${displayCommand}`);
  const run = spawnSync(command, args, { cwd: root, stdio: "inherit", env: process.env });
  if (run.status === 0) {
    results.push({ name, status: "passed", command: displayCommand });
    return;
  }

  results.push({ name, status: "failed", command: displayCommand });
}

function runGitleaks(): void {
  if (commandExists("gitleaks")) {
    runGate("gitleaks", "gitleaks", [
      "detect",
      "--source=.",
      "--config=.gitleaks.toml",
      "--no-git",
      "--redact",
      "--verbose",
    ]);
    return;
  }

  if (commandExists("docker")) {
    runGate("gitleaks", "docker", [
      "run",
      "--rm",
      "-v",
      `${root}:/repo`,
      "ghcr.io/gitleaks/gitleaks:v8.30.1",
      "detect",
      "--source=/repo",
      "--config=/repo/.gitleaks.toml",
      "--no-git",
      "--redact",
      "--verbose",
    ]);
    return;
  }

  results.push({ name: "gitleaks", status: "skipped", command: "gitleaks detect" });
  console.warn("gitleaks skipped: neither gitleaks nor docker is installed");
}

runGitleaks();
runGate("bun audit", "bun", ["audit", "--audit-level=high"]);
runGate("trivy fs", "trivy", [
  "fs",
  "--severity",
  "CRITICAL,HIGH",
  "--ignore-unfixed",
  "--exit-code",
  "1",
  "--trivyignores",
  ".trivyignore",
  ".",
], false);
runGate("shell-leak", "runx", ["shell-leak-scan", "--repo", "agentic-ecommerce-web"], false);
runGate("sentrux", "sentrux", ["gate", "."], false);

mkdirSync(reportDir, { recursive: true });
writeFileSync(
  resolve(reportDir, "v180-security-refresh.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
);

const failures = results.filter((result) => result.status === "failed");
if (failures.length > 0) {
  console.error(`Security refresh failed: ${failures.map((result) => result.name).join(", ")}`);
  process.exit(1);
}

console.log("Security refresh gates passed or were explicitly skipped when optional tools were unavailable.");
