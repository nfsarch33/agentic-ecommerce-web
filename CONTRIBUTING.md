# Contributing to Agentic Ecommerce Web (Frontend)

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) |
| bun | 1.2+ | [bun.sh](https://bun.sh/) |
| Playwright | Latest | `bunx playwright install` |

## Development Setup

```bash
git clone git@github.com:nfsarch33/agentic-ecommerce-web.git
cd agentic-ecommerce-web

# Install dependencies
bun install

# Run development server
bun dev

# Run tests
bun test

# Run E2E tests
bunx playwright test
```

## Branch Naming

| Prefix | Use |
|--------|-----|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code restructuring (no behaviour change) |
| `perf/` | Performance improvements |
| `test/` | Test additions or fixes |
| `docs/` | Documentation only |
| `release/` | Release preparation |
| `qa/` | QA and validation work |

## Commit Convention

```
type(scope): message
```

Examples:
- `feat(dashboard): add margin analytics chart`
- `fix(sse): reconnect on connection drop`
- `perf(bundle): lazy-load heavy chart components`
- `test(e2e): add Playwright tests for onboarding flow`
- `docs(readme): update development instructions`

## Pull Request Process

1. Branch from `main` using the naming convention above
2. Write tests for new features
3. Run quality gates before pushing:

```bash
# Unit + integration tests
bun test

# Type checking
bunx tsc --noEmit

# Linting
bun lint

# E2E tests
bunx playwright test

# Build verification
bun run build
```

4. Open a PR against `main`
5. CI must pass (lint, typecheck, test, build, Playwright)
6. Merge on green CI

## Quality Gates

| Gate | Threshold | Command |
|------|-----------|---------|
| Tests pass | 100% | `bun test` |
| TypeScript strict | 0 errors | `bunx tsc --noEmit` |
| Lint | 0 warnings | `bun lint` |
| E2E | 100% pass | `bunx playwright test` |
| Build | Clean | `bun run build` |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Data fetching**: SWR with stale-while-revalidate
- **Styling**: Tailwind CSS

## Code Style

- TypeScript strict mode enabled
- Prefer server components where possible
- Use SWR for client-side data fetching
- Follow Next.js App Router conventions
