# Repository Guidelines

## Project Structure & Modules

- Source lives in `src/` (`cli/`, `parser/`, `dsl/`, `validator/`, `generators/`, `extractor/`, `reverse/`, `utils/`); tests are co-located in `src/__tests__/`.
- Docs stay in `docs/`; runnable samples in `examples/`; scripts for automation in `scripts/`; build output in `dist/` (do not commit).
- Agrupa nuevos módulos y artefactos por feature manteniendo nombres paralelos (por ejemplo, `validator/feature-x-validator.ts` + `docs/feature-x.md`) para acelerar el contexto entre capas.

## Build, Test, and Development Commands

- Install with `npm install` (Node 18+). `npm run dev` watches TypeScript; `npm run build` emits `dist/`.
- Quality: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`.
- Verification: `npm test`, `npm run test:coverage`, `npm run compile-examples`, `npm run validate-examples`, `npm run ci` (full lint/format/test/build), `npm run coverage-upload` (Codecov).

## Coding Style & Naming

- TypeScript strict, 2-space indent, semicolons; files use kebab-case, exported types/interfaces use PascalCase, constants use SCREAMING_SNAKE_CASE.
- Keep modules pure and deterministic (especially generators). Add explicit return types on exported functions; avoid hidden side effects y replica firmas entre capas cuando compartan responsabilidad.
- Prioriza actualizar stubs/puntos de extensión existentes antes de introducir lógica ad hoc; limita comentarios a flujos realmente complejos y deja que los nombres/fixtures transmitan el resto para optimizar tokens.
- ESLint + Prettier enforced; resolve warnings before merging when feasible.

## Testing Guidelines

- Jest for unit/integration; name tests `<file>.test.ts` and keep near code.
- Cover happy and failure paths for parsing, DSL building, validation, and XML generation; add fixtures under `examples/` when they clarify behavior.
- Run full suite with coverage before finishing any code change.

## Commit & Pull Request Guidelines

- Use Conventional Commits (e.g., `feat: add flow connector mapping`), ≤72 chars en el título y usa scopes cuando proceda. Before committing/pushing, display the planned commit message for approval.
- PRs/reportes: incluye resumen, issue/task, directorios afectados, resultados QA/tests (logs, cobertura) y sample CLI input/output; keep diffs focused. Update `README.md` for any new flag, feature, or workflow change.

## Agent Working Protocol (read every session)

- Read `PROJECT_PLAN.md` (and parent task steps) before coding; follow the plan without deviations. If a review doc exists, read it and apply required fixes.
- On finishing a task: mark it Closed/Review in the plan, log bugs/incidents there, report code changes with file paths, and show the updated project map.
- Always run unit tests with coverage and ESLint; if told a commit is pending, comply immediately.
- For deploy tasks, create `DEPLOY_STEPS.MD` with full steps; when closing a branch/project, delete generated/intermediate phase/task docs (keep `README.md`).
- Keep this guide aligned with `CLAUDE.md`; incorporate any new prompts. If no tasks are open, scan docs for content that should move into `README.md`.
- New features must be documented in `README.md`. Remove non-README generated docs when closing work to avoid clutter.
- For every phase or sprint that requires planning, create a dedicated doc named after the sprint/phase; when the project/branch is closed, those planning docs must be deleted (keep only README).
- At the start of any new development project, create and work on a dedicated branch.
- Always pair development work with a documented plan that lists the tasks needed for the objective; cuando algún rol solicite un plan, genera un artefacto Markdown (e.g., en `docs/planning/`) además del resumen en chat.
- Follow software engineering principles such as DRY, TDD, KISS, and optimize token usage. Prefer referencing existentes outputs/docs en vez de repetir texto extenso y evita mocks salvo dependencias externas imposibles de testear.
- Al cerrar un proyecto:
- 1.  Genera y completa el Pull Request correspondiente (incluye resúmenes/tests).
- 2.  Al aprobarse, elimina el branch local y, si procede, el remoto.
- 3.  Cambia de nuevo a `master` o `main` en el entorno antes de continuar.
