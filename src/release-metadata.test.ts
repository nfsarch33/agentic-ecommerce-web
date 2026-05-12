import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const rootFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("v8 frontend release metadata", () => {
  it("keeps release metadata aligned with v8.0.0", () => {
    const pkg = JSON.parse(rootFile("package.json")) as { version?: string };

    expect(pkg.version).toBe("8.0.0");
    expect(rootFile("README.md")).toContain("Current release: **v8.0.0**");
    expect(rootFile("CHANGELOG.md")).toContain(
      "## [8.0.0] - 2026-05-13 -- Frontend v8 media UX release",
    );
    expect(rootFile("docs/release-checklist.md")).toContain("# v8.0.0 Frontend Release Checklist");
    expect(rootFile("docs/release-checklist.md")).toContain("docs/v8-frontend-release-final.md");
    expect(rootFile("docs/v8-frontend-release-final.md")).toContain(
      "# EC v8.0.0 Frontend Release Final Evidence",
    );
  });
});
