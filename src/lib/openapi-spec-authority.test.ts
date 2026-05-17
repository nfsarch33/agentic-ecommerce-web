import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("OpenAPI spec authority", () => {
  it("fails fast when OPENAPI_SPEC_PATH points to a missing file instead of silently falling back", () => {
    const result = spawnSync("bun", ["run", "scripts/generate-api-types.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        OPENAPI_SPEC_PATH: "/tmp/does-not-exist-v5015-openapi.yaml",
      },
    });

    expect(result.status, result.stdout + result.stderr).not.toBe(0);
    expect(result.stdout + result.stderr).toContain("OPENAPI_SPEC_PATH");
  }, 45_000);
});
