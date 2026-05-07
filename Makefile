.PHONY: release-e2e

release-e2e: ## Run v2.0.0 deterministic release E2E flow
	E2E_RELEASE_FLOW=true bun run test:e2e e2e/v200-release-flow.spec.ts
