#!/usr/bin/env bun
/**
 * Generates TypeScript types from the backend OpenAPI spec.
 *
 * Usage: bun run scripts/generate-api-types.ts
 * Or via package.json: bun run api:generate
 *
 * Override spec location with OPENAPI_SPEC_PATH env var.
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const root = resolve(__dirname, "..");
const OUTPUT_PATH = resolve(root, "src/lib/adapters/api/generated/schema.d.ts");

const candidates = [
  process.env["OPENAPI_SPEC_PATH"],
  resolve(root, "../agentic-ecommerce/api/openapi.yaml"),
  resolve(root, "../../agentic-ecommerce/api/openapi.yaml"),
].filter(Boolean) as string[];

const specPath = candidates.find((p) => existsSync(p));
if (!specPath) {
  console.error("Could not find openapi.yaml. Set OPENAPI_SPEC_PATH or place the backend repo as a sibling.");
  process.exit(1);
}

console.log(`Generating types from: ${specPath}`);
console.log(`Output: ${OUTPUT_PATH}`);

execSync(`bunx openapi-typescript "${specPath}" -o "${OUTPUT_PATH}"`, {
  stdio: "inherit",
  cwd: root,
});

console.log("Done.");
