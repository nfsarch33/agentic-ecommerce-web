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
    const releaseChecklist = rootFile("docs/release-checklist.md");
    const finalEvidence = rootFile("docs/v9-frontend-release-final.md");

    expect(pkg.version).toBe("9.0.0");
    expect(pkg.description).toContain("Next.js 16");
    expect(rootFile("README.md")).toContain("Current release: **v9.0.0**");
    expect(rootFile("CHANGELOG.md")).toContain(
      "## [9.0.0] - 2026-05-14 -- Frontend v9 release metadata baseline",
    );
    expect(releaseChecklist).toContain("# v9.0.0 Frontend Release Checklist");
    expect(releaseChecklist).toContain("docs/v9-frontend-release-final.md");
    expect(finalEvidence).toContain("# EC v9.0.0 Frontend Release Final Evidence");
    expect(releaseChecklist).toContain("primary-testing");
    expect(releaseChecklist).not.toContain("secondary-testing");
    expect(releaseChecklist).toContain("full primary self-hosted regression");
    expect(finalEvidence).toContain("primary-testing");
    expect(finalEvidence).not.toContain("secondary-testing");
    expect(finalEvidence).toContain("UIAuto evidence participates in the primary release gate");
    expect(finalEvidence).toMatch(
      /Known-good probes from this session: `oracle-jump`, `wsl1-travel`, and\s+`wsl2-travel`\./,
    );
    expect(finalEvidence).toMatch(
      /missing `win1-travel` and\s+`win2-travel` aliases in local SSH config/,
    );
    expect(releaseChecklist).not.toContain("GCP Cloud Run");
    expect(finalEvidence).not.toContain("GKE staging must be green before tagging `v9.0.0`.");
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
