import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("ESLint flat config", () => {
  it("loads Next.js lint rules without circular config errors", () => {
    const result = spawnSync("bunx", ["eslint", "--print-config", "src/app/page.tsx"], {
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('"rules"');
  });
});
