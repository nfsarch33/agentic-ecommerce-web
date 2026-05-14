#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
artifact_dir="${repo_root}/.gitlab-artifacts/local-stack"
mkdir -p "${artifact_dir}"

PLAYWRIGHT_HTML_REPORT="${artifact_dir}/playwright-report" bun run test:e2e:local-stack \
  2>&1 | tee "${artifact_dir}/local-stack.log"
