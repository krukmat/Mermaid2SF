# Codex Task Test Fix Plan

## Objective
Follow `docs/handoff/codex_task.md` to repair the failing CLI and integration suites so the requested `npm test` commands run cleanly with coverage.

## Steps
1. Align `src/__tests__/cli/compile.test.ts` with the actual helper scope (keep `mockInputPath`/`mockOutputDir` defined) and remove duplicated blocks so mocks and assertions execute in the intended scope.
2. Update `src/__tests__/cli/test-plan.test.ts` to call `analyzePaths` and `generateTestData` the way the real modules expect (FlowDSL input, single argument) and tighten the mocked expectations.
3. Fix the regex checks in `src/__tests__/integration.test.ts` so they use valid patterns (escape closing tags) and keep expectations realistic.
4. Run all commands listed in the handoff document, collecting their output for the summary.
