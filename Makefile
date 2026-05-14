.PHONY: release-e2e

release-e2e: ## Run the deterministic release-flow E2E smoke
	E2E_RELEASE_FLOW=true bun run test:e2e e2e/v200-release-flow.spec.ts
