#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
artifact_dir="${repo_root}/.gitlab-artifacts/cleanup"
mkdir -p "${artifact_dir}"

rm -rf "${repo_root}/playwright-report" "${repo_root}/test-results" "${repo_root}/.next"
printf '{"playwright_report_removed":true,"test_results_removed":true,"next_removed":true}\n' \
  >"${artifact_dir}/summary.json"
