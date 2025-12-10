# Flow Validation Architecture

This document complements `FLOW_VALIDATION_RULES.md` with the proposed implementation architecture so the web builder and CLI share the same enforcement logic.

## Shared Validator Module

- Create `src/validation/flow-rules.ts` exporting `validateFlow(nodes: FlowNode[])`, `FlowValidationResult`, and enums/constants for rule IDs.
- Each rule returns `{code, severity: 'error' | 'warning', message, nodes: string[]}` so both UI and CLI can highlight offending elements.
- Keep the validator pure: it should analyze node metadata without DOM/UI dependencies, enabling reuse from the CLI and the browser build (via bundler or simple copy/compile step).

## When to Run Checks

| Context                         | Trigger                                                               | Handling                                                                                                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder (web)                   | After every mutation (drag, add, edit, delete, template load, import) | Call `validateFlow`. Cache results per flow; update the status banner list and disable compile/export buttons while errors persist. Display warnings but allow save/deploy (non-blocking) if severity is `warning`.                |
| CLI `compile`/`lint`            | Before emitting DSL/XML                                               | Invoke validator; if any `error`s appear, abort with non-zero exit and printed summary. `--strict` flag already exists; simply treat `error`s as fatal by default, optionally exposing `--allow-warnings` for warnings-only flows. |
| CLI `interactive` (web backend) | On nodes update                                                       | Run validator so API responses include issues; frontend can re-use this info if we expose a `/api/validate` endpoint later for tighter syncing.                                                                                    |
| Imports/templates               | During load                                                           | Validate the resulting nodes immediately and display results so the UI never proceeds with invisible errors.                                                                                                                       |

## UI Feedback Layer

- Reuse `statusDetails` card to render validation issues, grouped by severity. Each entry links to the node ID and rule description.
- Add a helper `hasValidationError()` that toggles the compile button (`#compileXml`) disabled attribute and adds an inline badge near the canvas (e.g., “Validation errors block deployment”).
- Consider highlighting nodes with rule violations with a CSS class (e.g., `.node.invalid`), especially for errors affecting connectors or missing metadata.

## CLI Integration

- Import the validation module in `src/cli/commands/compile.ts`, `lint.ts`, and any command calling `generateDsl`.
- On error, print a table summarizing `[code] message (nodeIds)` and exit with status `1`. Warnings can show but still allow the command to succeed unless `--strict`/`--fail-on-warning` is passed.
- Add unit tests to `src/__tests__` verifying failure cases for each rule so future refactors keep the contract.

## Testing & Documentation

- Write Jest tests for `validateFlow` covering valid and invalid flows (various connectors, missing defaults, unreachable nodes, wrong metadata).
- Update README/AGENTS to mention the validation rules and the expectation that flows must pass before deploying (point readers to `FLOW_VALIDATION_RULES.md` + `FLOW_VALIDATION_ARCHITECTURE.md`).
- Document CLI flags (`--skip-validation`? optional) and how the web builder surfaces issues.
- Outline implementation tasks:
  1. Build `src/validation/flow-rules.ts` containing rule definitions, helpers to inspect connectors, and exports for codes/messages.
  2. Create Jest tests under `src/__tests__/flow-rules.test.ts` for each rule to freeze behavior.
  3. Import the validator into `web/frontend/index.html` (via bundler or copy) and wire it into `renderAll`, status card, and compile button state.
  4. Import the validator into CLI commands (`compile`, `lint`, `interactive`) so invalid flows are rejected before DSL/XML generation.
  5. Update README/AGENTS and add release note describing the new validation layer and expectations.
