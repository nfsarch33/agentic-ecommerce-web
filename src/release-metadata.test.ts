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
    const v10Checklist = rootFile("docs/v10-frontend-release-checklist.md");
    const v10FinalEvidence = rootFile("docs/v10-frontend-release-final.md");

    expect(pkg.version).toBe("9.0.0");
    expect(pkg.description).toContain("Next.js 16");
    expect(rootFile("README.md")).toContain("Current release: **v9.0.0**");
    expect(rootFile("README.md")).toContain("docs/v10-frontend-release-final.md");
    expect(rootFile("CHANGELOG.md")).toContain(
      "## [9.0.0] - 2026-05-14 -- Frontend v9 release metadata baseline",
    );
    expect(releaseChecklist).toContain("# v9.0.0 Frontend Release Checklist");
    expect(releaseChecklist).toContain("docs/v9-frontend-release-final.md");
    expect(releaseChecklist).toContain("docs/v10-frontend-release-final.md");
    expect(releaseChecklist).toContain("semver-only release tags");
    expect(finalEvidence).toContain("# EC v9.0.0 Frontend Release Final Evidence");
    expect(releaseChecklist).toContain("primary-testing");
    expect(releaseChecklist).not.toContain("secondary-testing");
    expect(releaseChecklist).not.toContain("v9.0.0-rc");
    expect(releaseChecklist).toMatch(/full primary\s+self-hosted regression/);
    expect(finalEvidence).toContain("primary-testing");
    expect(finalEvidence).not.toContain("secondary-testing");
    expect(finalEvidence).not.toContain("v9.0.0-rc");
    expect(finalEvidence).toContain("UIAuto evidence participates in the primary release gate");
    expect(finalEvidence).toContain(
      "Known-good travel-path probes from this session cover the primary Linux,",
    );
    expect(finalEvidence).toContain(
      "secondary Linux, and primary Windows travel aliases.",
    );
    expect(finalEvidence).toMatch(
      /Direct follow-up probes for additional aliases were inconclusive because the\s+tooling layer timed out/,
    );
    expect(v10Checklist).toContain("# v10.0.0 Frontend Release Checklist");
    expect(v10Checklist).toContain("primary-testing");
    expect(v10Checklist).toContain("SSE");
    expect(v10Checklist).toContain("planner/status");
    expect(v10Checklist).toContain("semver-only release tags");
    expect(v10Checklist).not.toContain("v10.0.0-rc");
    expect(v10FinalEvidence).toContain("# EC v10.0.0 Frontend Release Final Evidence");
    expect(v10FinalEvidence).toContain("planner/status");
    expect(v10FinalEvidence).toContain("semver-only release tag");
    expect(v10FinalEvidence).toContain("Future Flutter work");
    expect(v10FinalEvidence).not.toContain("Flutter scaffold");
    expect(v10FinalEvidence).not.toContain("v10.0.0-rc");
    expect(v10FinalEvidence).toContain("primary-testing");
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
      "docs/v10-frontend-release-checklist.md",
      "docs/v10-frontend-release-final.md",
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
