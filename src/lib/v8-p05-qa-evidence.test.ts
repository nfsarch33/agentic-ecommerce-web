import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("v8 Pair 5 frontend UX media QA evidence", () => {
  it("records Playwright, uiauto, Lighthouse, hydration, and remote vision boundaries", () => {
    const qa = readRepoFile("docs/operations/v8-p05-frontend-ux-media-qa.md");
    const comparison = readRepoFile("docs/uiauto-playwright-comparison.md");

    expect(qa).toContain("Playwright stable");
    expect(qa).toContain("56 passed / 2 skipped");
    expect(qa).toContain("uiauto fixtures mode");
    expect(qa).toContain("runx env scrub -- make uiauto-compare");
    expect(qa).toContain("Lighthouse");
    expect(qa).toContain("hydration drift");
    expect(qa).toContain("remote OmniParser");
    expect(qa).toContain("not run on the MacBook");
    expect(qa).toContain("Sentrux");
    expect(qa).toContain("Agenttrace");

    expect(comparison).toContain("Pair 5");
    expect(comparison).toContain("admin-media");
    expect(comparison).toContain("fixtures mode");
  });
});
