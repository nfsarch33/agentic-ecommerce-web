#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
artifact_dir="${repo_root}/.gitlab-artifacts/uiauto"
mkdir -p "${artifact_dir}"

if ! command -v runx >/dev/null 2>&1; then
  echo "runx not installed on this runner; skipping hosted UIAuto compare while primary-testing remains the blocking lane" \
    | tee "${artifact_dir}/uiauto-skip.log"
  exit 0
fi

runx test-lane run --lane frontend-uiauto-compare --pool "${RUNX_TEST_POOL:-primary-testing}" \
  2>&1 | tee "${artifact_dir}/uiauto-compare.log"
