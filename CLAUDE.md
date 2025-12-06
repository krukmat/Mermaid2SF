# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: AGENTS.md Synchronization

**CRITICAL:** When changes are made to `AGENTS.md`, you MUST:
1. Read and understand the updates in `AGENTS.md`
2. Adapt the instructions to fit the context of this `CLAUDE.md` file
3. Incorporate them as valid guidelines in the appropriate sections below
4. Maintain consistency between both files without duplicating content verbatim

## Project Overview

**Mermaid-to-Flow Compiler** (`mermaid-flow-compiler`) is a Node.js + TypeScript CLI that compiles Mermaid flowchart diagrams into Salesforce Flow metadata (`*.flow-meta.xml`).

The system introduces an **Intermediate Model (Flow DSL)** as a stable, AI-friendly representation of Salesforce Flows that bridges visual diagrams and production metadata.

**Core Value**: Enable version control, CI/CD integration, AI-driven design/review, and structural refactoring of Salesforce Flows—currently locked inside Flow Builder UIs.

### Key Documents
- `mermaid-flow-compiler-architecture.md`: The authoritative spec for design and implementation. Treat as source of truth.

---

## Architecture at a Glance

```
Mermaid Diagram (.mmd)
    ↓ [MermaidParser]
Graph (nodes + edges)
    ↓ [MetadataExtractor]
Raw metadata (types, API names, fields, conditions)
    ↓ [IntermediateModelBuilder]
Flow DSL (JSON/YAML)
    ↓ [Validator]
Validated DSL
    ↓ [FlowXmlGenerator + DocsGenerator]
*.flow-meta.xml + normalized .mmd + markdown docs
```

### Core Modules (v1 Target)

1. **MermaidParser**: Extract nodes and edges from Mermaid text
2. **MetadataExtractor**: Parse node labels to extract type, API name, fields, conditions
3. **IntermediateModelBuilder**: Build Flow DSL from extracted metadata
4. **Validator**: Structural (Start/End present, reachability) and semantic (Decision outcomes) validation
5. **FlowXmlGenerator**: Produce `*.flow-meta.xml` from DSL
6. **DocsGenerator**: Generate normalized Mermaid + markdown documentation

### Element Types (v1)
- `Start`, `End`, `Assignment`, `Decision`, `Screen`, `RecordCreate`, `RecordUpdate`, `Subflow`

### Flow DSL Schema Reference
The intermediate model is YAML/JSON with structure:
```yaml
version: 1
flowApiName: ContactRouting
label: "Contact Routing"
processType: "Autolaunched"  # or Record-Triggered, Screen
startElement: Start_1
variables: [...]
elements: [...]
```

See section 5.2 in `mermaid-flow-compiler-architecture.md` for full schema.

### Mermaid Input Conventions
Elements are labeled with type prefix and key-value metadata:
```
SCREEN: Collect Data
  api: Screen_Collect_Data
  label: Collect Data

DECISION: Has Email?
  api: Dec_Has_Email
  label: Has Email?

CREATE: Case
  api: Create_Case
  object: Case
  fields:
    Subject = 'New Case'
```

See section 6 in `mermaid-flow-compiler-architecture.md` for full conventions.

---

## CLI Interface

```bash
mermaid-flow-compile \
  --input flows/ContactRouting.mmd \
  --out-flow force-app/main/default/flows \
  --out-json .generated/flows \
  --out-docs docs/flows \
  --org-meta .sf-meta/cache.json \
  --strict
```

**Parameters:**
- `--input`: Path to `.mmd` file
- `--out-flow`: Directory for generated `*.flow-meta.xml`
- `--out-json`: Directory for generated DSL (`.flow.json` or `.flow.yaml`)
- `--out-docs`: Directory for docs (normalized Mermaid + markdown)
- `--org-meta`: (Optional) Org metadata dump for validation
- `--strict`: Warnings become errors (non-zero exit)

**Exit codes:**
- `0`: Success
- `1`: Validation/parsing errors
- `2`: Internal errors (IO, exceptions)

---

## Development & Test Commands

### Setup
```bash
npm install
npm run build
```

### Development
```bash
npm run dev              # Watch mode (TypeScript compilation)
npm run cli -- --help   # Run CLI locally
npm test                # Run all tests
npm run test:watch      # Tests in watch mode
npm run lint            # Lint code
npm run format          # Format code (Prettier)
```

### Testing Strategy (TDD First)

**Unit Tests** – Three layers:
1. **Parser & Metadata Extraction**
   - Test each element type with valid/invalid Mermaid
   - Verify error messages are clear

2. **Flow XML Generator**
   - Compare generated XML against golden files
   - Ensure diffs are minimal for small changes

3. **Integration**
   - Mermaid → DSL → Flow XML end-to-end
   - Optional: Deploy to scratch org and verify in Flow Builder

**Test Framework**: Jest (recommended)
```bash
npm test -- src/__tests__/parser.test.ts
npm test -- --coverage
```

### Linting & Formatting
```bash
npm run lint            # ESLint
npm run format          # Prettier
npm run type-check      # TypeScript check
```

---

## Key Design Principles

1. **Deterministic Behavior**
   - Same input → same output (no random IDs, timestamps in outputs)
   - Crucial for Git diffs and CI pipelines

2. **Reproducible & Git-Friendly**
   - Minimal diffs when making small changes
   - No unnecessary node reordering or metadata shuffling
   - Schema is stable across versions (evolves additively)

3. **Separation of Concerns**
   - Mermaid → Intermediate Model → Flow XML (not all-in-one)
   - Each stage is independently testable and replaceable

4. **AI-Friendly DSL**
   - Declarative structure (what, not how)
   - Homogeneous fields, consistent naming
   - Agents can read/edit DSL and suggest refactors

5. **Simple, Composable Modules**
   - No monolithic components
   - Each module has one responsibility
   - Easy to extend for new element types in v2+

---

## Folder Structure

```
mermaid-flow-compiler/
├── src/
│   ├── cli/              # CLI entry point & command definitions
│   ├── parser/           # MermaidParser (text → graph)
│   ├── extractor/        # MetadataExtractor (graph → metadata)
│   ├── dsl/              # IntermediateModelBuilder & DSL types
│   ├── validator/        # Validator (structural & semantic checks)
│   ├── generators/       # FlowXmlGenerator, DocsGenerator
│   ├── types/            # Shared TypeScript interfaces
│   └── utils/            # Helper functions (logging, IO)
├── src/__tests__/        # Test files (mirror src structure)
├── examples/             # Sample .mmd files and expected outputs
├── docs/                 # Project documentation
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── mermaid-flow-compiler-architecture.md
└── CLAUDE.md
```

---

## Workflow for New Features / Fixes

1. **Before Starting**: Check `mermaid-flow-compiler-architecture.md` to align with spec
2. **Plan First** (if complex):
   - Identify which modules are affected
   - Sketch DSL/XML changes if needed
   - List unit & integration tests required
3. **TDD Approach**:
   - Write tests first (failing)
   - Implement feature
   - Verify tests pass
4. **Code Comments**:
   - Mark line/module with task/feature reference (e.g., `// TASK: Support Subflow`)
   - Update affected files list in plan doc after completion
5. **Validation & Formatting**:
   - `npm run lint` and `npm run format`
   - Ensure `npm test` passes
   - Run `npm run type-check` for TypeScript errors
6. **Commit**:
   - Include task reference in message
   - Small, focused commits preferred
   - If needed, update `mermaid-flow-compiler-architecture.md` with implementation notes

---

## Important Notes

- **Source of Truth**: `mermaid-flow-compiler-architecture.md` defines the spec. Code must align with it.
- **v1 Scope**: Focus on `Start`, `End`, `Assignment`, `Decision`, `Screen`, `RecordCreate`, `RecordUpdate`, `Subflow`. Other elements (Loops, Waits, Faults) are Phase 2+.
- **No Mocking in Tests**: When possible, tests should work with real data flows (not mocked dependencies) to match production behavior.
- **Deterministic Output**: Avoid random IDs, timestamps, or non-deterministic ordering. This is critical for CI/Git workflows.
- **AI Integration**: DSL is designed for use by agents (read/edit for analysis and refactoring). Keep it stable and human-readable.

---

## Roadmap Context

- **Phase 1 (PoC)**: Basic `Start`, `End`, `Assignment`, `Decision`
- **Phase 2 (v1)**: Add `Screen`, `RecordCreate`, `RecordUpdate`, `Subflow`; validation; CI integration
- **Phase 3 (AI)**: JSON Schema/OpenAPI for DSL; `lint` and `explain` commands; deep AI pipeline integration
- **Phase 4 (Extensions)**: Loops, advanced Waits, Faults, automatic test suggestions, web visualizer

---

## Quick References

### Building & Running
```bash
npm run build && npm run cli -- --input example.mmd --out-flow ./output
```

### Debugging
```bash
npm run dev                    # TypeScript watch
npm test -- --verbose         # Verbose test output
npm run type-check            # Find type errors
```

### Performance & Quality
```bash
npm run lint
npm run format
npm test -- --coverage        # See test coverage
```

### Integration with SFDX/Hardis
After compilation, deploy with:
```bash
sfdx force:source:deploy -m Flow:YourFlowName
# or with Hardis:
hardis:package:deploy --flow-folder force-app/main/default/flows
```

---

## External Integration Points

1. **agnostic-ai-pipeline**: Agents read/edit `.mmd` and DSL files for:
   - Analyst: Business → initial diagrams
   - Architect: Refine diagrams/DSL
   - Implementor: Invoke CLI, analyze validation errors
   - Reviewer: Inspect DSL for risks, suggest tests

2. **SFDX/Hardis/CI**: CLI output (`*.flow-meta.xml`) integrates with standard Salesforce deployment tools

3. **Mermaid Editor**: Diagrams can be created in VS Code, mermaid-live.com, or Confluence

---

## Notes for Claude Code Instances

- Always refer to `mermaid-flow-compiler-architecture.md` as the spec when making design decisions
- Use TDD: write tests before implementation
- Mark code with task references (e.g., `// TASK: Support SubFlow invocations`)
- Ask for clarification if spec is ambiguous
- Avoid over-engineering; follow "simple and composable" principle
- Before deleting code, confirm intent (check instructions in `/Users/matiasleandrokruk/.claude/CLAUDE.md`)
- When stuck, search web for relevant approaches (e.g., "Mermaid parser TypeScript")

---

## Agent Working Instructions

### Pre-Development
- **Leer el plan antes de desarrollar**: Revisar `PROJECT_PLAN.md` y respetar el plan sin desvíos
- **Revisar tareas padre**: Antes de trabajar en una tarea hija, completar los pasos relacionados de la tarea padre
- **Evaluar documentos de review**: Si existe un documento de review pendiente, evaluarlo y corregir según se solicite para pasar el proceso de revisión

### Durante el Desarrollo
- **Preserve pipeline separation**: Mermaid → Intermediate Flow DSL → Flow XML. Cada etapa debe ser testeable independientemente
- **Normalize inputs**: Antes de generar, normalizar para mantener diffs estables (ordenamiento determinístico de nodos/edges/variables)
- **Surface validation errors**: Incluir mensajes accionables (element id, línea, forma esperada) para ayudar tanto a humanos como agentes AI
- **TypeScript strict mode**: Usar modo estricto, preferir composición sobre herencia, mantener módulos pequeños
- **Naming conventions**: Files en kebab-case (e.g., `mermaid-parser.ts`); types/interfaces en PascalCase
- **Code style**: 2 espacios de indentación, semicolons habilitados, tipos de retorno explícitos en funciones exportadas

### Testing
- **Always run tests**: Siempre ejecutar todos los unit tests con cobertura cuando apliques cambios de código
- **Run linting**: Asegurarse de que ESLint/linting también pase
- **Coverage requirements**: Happy paths y casos de falla (e.g., sintaxis Mermaid inválida, nodos faltantes)
- **Add fixtures**: Usar `examples/` cuando la claridad del escenario ayude
- **Test boundaries**: Cubrir parsing, extracción, validación y generación de XML; snapshots solo cuando el output es estable

### Post-Development
- **Marcar tareas**: Al terminar una tarea, marcarla como cerrada o en revisión en `PROJECT_PLAN.md`
- **Reportar cambios**: Reportar los cambios de código con rutas/ubicaciones para facilitar la revisión visual
- **Documentar features**: Todo feature nuevo debe estar documentado en el `README.md`
- **Mostrar estado**: Al finalizar una tarea, mostrar el mapa del proyecto con el estado actualizado
- **Reportar bugs**: Reportar bugs o incidencias en el plan

### Commits & Pull Requests
- **Before commit**: Antes de hacer commit y push, reportar el mensaje de commit (con detalle funcional del feature) en pantalla para evaluación y autorización
- **Commit style**: Usar commits claros en presente (e.g., `feat: add decision outcome parsing`, `test: cover invalid edge labels`)
- **Conventional Commits**: Preferir Conventional Commits para friendly changelogs
- **PR requirements**: Incluir descripción concisa, issue/task vinculado, resultados de tests (`npm test` output), y sample CLI input/output si cambia comportamiento
- **Keep PRs small**: PRs pequeños y enfocados; actualizar docs (README/PROJECT_PLAN/architecture) cuando se alteren CLI flags o Flow DSL shape

### Documentation & Cleanup
- **README updates**: Si el proyecto no tiene tareas abiertas, revisar los documentos por si hay contenido relevante que agregar al `README`
- **Deploy documentation**: Para tareas de deploy, generar un documento aparte llamado `DEPLOY_STEPS.md` con el detalle completo de pasos y consideraciones
- **Cleanup on close**: Al cerrar el branch o el proyecto, eliminar documentos generados que no sean el `README` para evitar basura

### Build Artifacts
- **Never commit**: No commitear `dist/`, `node_modules/`, o `coverage/`
- **Debug artifacts**: Los artifacts de debug van a `.debug/` (gitignored)
