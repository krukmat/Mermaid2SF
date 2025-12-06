# Repository Guidelines

## Project Structure & Module Organization
- Source lives under `src/` with feature folders planned as `cli/`, `parser/`, `extractor/`, `dsl/`, `validator/`, `generators/`, `types/`, and `utils/`. Keep shared contracts in `src/types/`.
- Unit tests stay alongside code in `src/__tests__/` (mirroring folder names). Add integration samples under `examples/` and long-form docs under `docs/`.
- Build artifacts go to `dist/`; never commit `dist/`, `node_modules/`, or `coverage/`.

## Build, Test, and Development Commands
- `npm install` — install dependencies (Node 18+ recommended).
- `npm run build` — type-check and emit compiled JS via `tsc` into `dist/`.
- `npm run dev` — TypeScript watch mode for rapid iterations.
- `npm run lint` / `npm run format` — ESLint + Prettier for style enforcement and autofix.
- `npm test`, `npm run test:watch`, `npm run test:coverage` — Jest unit tests, watch mode, and coverage report.

## Coding Style & Naming Conventions
- TypeScript-first; prefer composition over inheritance and keep modules small.
- Files use kebab-case (e.g., `mermaid-parser.ts`); types/interfaces in `types/` use PascalCase.
- 2-space indentation, semicolons enabled, `strict` TypeScript mode. Favor explicit return types on exported functions.
- Keep public APIs predictable: parse → extract → build → validate → generate; avoid hidden side effects.

## Testing Guidelines
- Framework: Jest with `ts-jest`. Co-locate tests as `<module>.test.ts`.
- Cover happy paths and failure cases (e.g., invalid Mermaid syntax, missing nodes). Add fixtures in `examples/` when scenario clarity helps.
- Aim for coverage on parsing, extraction, validation, and XML generation boundaries; add snapshot tests only when output is stable.

## Commit & Pull Request Guidelines
- Use clear, present-tense commits (e.g., `feat: add decision outcome parsing`, `test: cover invalid edge labels`). Conventional Commits are preferred for changelog friendliness.
- PRs should include: concise description, linked issue/task, test results (`npm test` output), and sample CLI input/output if behavior changes.
- Keep PRs small and focused; update docs (README/PROJECT_PLAN/architecture) when altering CLI flags or Flow DSL shape.

## Architecture & Agent Notes
- Preserve the pipeline separation: Mermaid → Intermediate Flow DSL → Flow XML. Each stage should be independently testable.
- Normalize inputs before generation to keep diffs stable (deterministic ordering of nodes/edges/variables).
- Surface validation errors with actionable messages (element id, line, expected shape) to aid both humans and AI agents.

## Working Instructions
- Antes de desarrollar, leer el documento de proyecto y respetar el plan sin desvíos.
- Al terminar una tarea, marcarla como cerrada o en revisión en el plan.
- Reportar bugs o incidencias en el plan.
- Si existe un documento de review pendiente, evaluarlo y corregir según se solicite para pasar el proceso de revisión.
- Antes de trabajar en una tarea hija, revisa y completa los pasos relacionados de la tarea padre.
- Al finalizar, reporta los cambios de código con rutas/ubicaciones para facilitar la revisión visual.
- Al finalizar una tarea, muestra el mapa del proyecto con el estado actualizado.
- Cuando recibas un documento de review, léelo (puede haber sido editado externamente) y aplica las correcciones requeridas.
- Siempre ejecuta todos los unit tests con cobertura cuando apliques cambios de código (cualquier lenguaje). Si corresponde, asegúrate de que ESLint/linting también pase.
