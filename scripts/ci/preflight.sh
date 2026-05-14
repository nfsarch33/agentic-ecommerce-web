#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
artifact_dir="${repo_root}/.gitlab-artifacts/preflight"
mkdir -p "${artifact_dir}"

bun --version | tee "${artifact_dir}/bun-version.txt"
node --version | tee "${artifact_dir}/node-version.txt"
bun install --frozen-lockfile
