#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
artifact_dir="${repo_root}/.gitlab-artifacts/playwright"
mkdir -p "${artifact_dir}"

bunx playwright install --with-deps chromium
PLAYWRIGHT_HTML_REPORT="${artifact_dir}/playwright-report" bun run test:e2e:stable \
  2>&1 | tee "${artifact_dir}/playwright-stable.log"
