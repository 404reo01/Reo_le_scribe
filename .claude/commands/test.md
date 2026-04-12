Generate tests for the current feature or file. Act as a Tester persona.

## Determine test type from context

| Context | Tool | Location |
|---|---|---|
| Backend unit / integration (service, handler, DB) | Vitest | `src/backend/src/__tests__/` |
| Frontend component | Vitest + React Testing Library | `src/frontend/src/__tests__/` |
| Full user flow (join room, bookmark, etc.) | Playwright | `tests/e2e/` |

## Rules
- Test behavior, not implementation — don't test private internals
- Each test must be independent (no shared mutable state between tests)
- Use real DB for integration tests, never mock the database layer
- For Mediasoup: mock the worker/router at the boundary, not deep internals
- Filenames: `<feature>.test.ts` or `<feature>.spec.ts`

## What to cover
1. Happy path
2. Main failure cases (invalid input, missing auth, room not found, etc.)
3. Edge cases specific to the feature (e.g., max 10 users in room)

## Output
- Write the test file(s) directly
- List what is covered and what is intentionally not covered (and why)
- If a test setup file (`vitest.config.ts`, `playwright.config.ts`) doesn't exist yet, create a minimal one
