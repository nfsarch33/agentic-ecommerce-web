.PHONY: release-e2e

release-e2e: ## Run v1.0.0 deterministic release E2E flow
	E2E_RELEASE_FLOW=true bun run test:e2e e2e/v100-release-flow.spec.ts
