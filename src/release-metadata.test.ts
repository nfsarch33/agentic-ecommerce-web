import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const rootFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("frontend release metadata", () => {
  it("keeps release metadata aligned with v9.0.0", () => {
    const pkg = JSON.parse(rootFile("package.json")) as {
      description?: string;
      version?: string;
    };

    expect(pkg.version).toBe("9.0.0");
    expect(pkg.description).toContain("Next.js 16");
    expect(rootFile("README.md")).toContain("Current release: **v9.0.0**");
    expect(rootFile("CHANGELOG.md")).toContain(
      "## [9.0.0] - 2026-05-14 -- Frontend v9 release metadata baseline",
    );
    expect(rootFile("docs/release-checklist.md")).toContain("# v9.0.0 Frontend Release Checklist");
    expect(rootFile("docs/release-checklist.md")).toContain("docs/v9-frontend-release-final.md");
    expect(rootFile("docs/v9-frontend-release-final.md")).toContain(
      "# EC v9.0.0 Frontend Release Final Evidence",
    );
  });

  it("keeps release-facing surfaces free of stale v2 and local-path drift", () => {
    const releaseFacingFiles = [
      "README.md",
      "docs/admin-operations.md",
      "docs/bff-routes.md",
      "docs/deployment.md",
      "docs/release-checklist.md",
      "docs/v9-frontend-release-final.md",
      "Makefile",
      "e2e/v200-release-flow.spec.ts",
      "test/uiauto/README.md",
      "test/uiauto/REPORT_TEMPLATE.md",
    ];
    const bannedFragments = [
      "v2.0.0",
      "Next.js 15",
      "/Code/personal/",
      "personal/agentic-ecommerce-web",
      "../../../../Code/",
      ".cursor/plans/",
    ];

    for (const path of releaseFacingFiles) {
      const content = rootFile(path);

      for (const fragment of bannedFragments) {
        expect(content).not.toContain(fragment);
      }
    }
  });
});
