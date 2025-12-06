# Mermaid-to-Flow Compiler – Architecture Spec (Prompt-Friendly)

> **Usage**:  
> This document is designed to be fed as a prompt to AI agents (Analyst / Architect / Implementor / Reviewer).  
> Treat it as the **source of truth** for designing and implementing a CLI that compiles Mermaid diagrams into Salesforce Flow metadata.

---

## 0. ROLE & GLOBAL INSTRUCTIONS FOR THE AGENT

You are a **Senior Software Architect & Salesforce Flow Expert**.

When operating using this spec:

- Prioritize:
  - **Deterministic behavior**
  - **Reproducible outputs**
  - **Git/CI friendliness**
  - **Salesforce Flow compatibility**
- Make all assumptions **explicit**.
- Prefer **simple, composable modules** over monolithic designs.
- Always respect the the separation:
  - **Mermaid → Intermediate Model → Flow XML**
- When generating code:
  - Prefer **Node.js + TypeScript CLI** (unless the user explicitly says otherwise).
  - Follow clean architecture principles (parsing, validation, generation separated).

---

## 1. CONTEXT

Salesforce Flow development today suele ocurrir directamente en Flow Builder dentro del org:

- La lógica vive dentro del org sin una representación textual clara.
- La documentación externa (Confluence, markdown, diagramas) se desincroniza rápido.
- Es difícil:
  - Hacer **review estructural** de Flows complejos.
  - Comparar versiones (diffs significativos).
  - Integrar estos Flows en **pipelines de IA**.

Queremos introducir un **CLI de compilación**:

> `mermaid-flow-compiler`  
> que toma **diagramas Mermaid** con convenciones específicas y genera:
> - **Salesforce Flow metadata** (`*.flow-meta.xml`).
> - **Documentación** (Mermaid normalizado + markdown).
> - Un **modelo intermedio** (JSON/YAML) como DSL del Flow.

Este CLI será consumido por:

- Desarrolladores y arquitectos (localmente, en CI, vía Hardis/SFDX).
- Agentes de IA dentro del **agnostic-ai-pipeline** (Analyst / Architect / Implementor / Reviewer).

---

## 2. OBJECTIVES

### 2.1. Main Objectives

1. **Definir Flows de Salesforce desde Mermaid**:
   - El **fuente de verdad** es un archivo `.mmd` versionado en Git.
2. Introducir un **modelo intermedio (Flow DSL)**:
   - Representa el Flow de manera estructurada (JSON/YAML).
   - Es legible y editable por humanos y por agentes.
3. Generar automáticamente:
   - `*.flow-meta.xml` listos para deploy.
   - Documentación técnica (Mermaid normalizado y markdown).
4. Integrar el CLI con:
   - **SFDX / Hardis / CI/CD**.
   - **agnostic-ai-pipeline**, para:
     - diseñar,
     - validar,
     - refactorizar,
     - documentar Flows.

### 2.2. Non-Goals (v1)

- No cubrir todos los tipos de elementos de Flow. v1 se centra en un subconjunto útil:
  - Start, End, Screen, Assignment, Decision, RecordCreate, RecordUpdate, Subflow (y opcionalmente Wait).
- No reemplazar completamente Flow Builder:
  - El Flow se genera desde código/DSL, pero se puede ajustar luego desde la UI.
- No generar aún tests automáticos de Flow (puede venir en fases posteriores usando el modelo intermedio).

---

## 3. SCOPE

### 3.1. In Scope (v1)

- Parser de **Mermaid flowchart** con convenciones específicas.
- Modelo intermedio (JSON/YAML) que describe:
  - Elementos del Flow (tipo, API name, etiquetas, campos, condiciones, etc.).
  - Variables y opciones básicas.
  - Conectores entre elementos.
- Generador de:
  - `*.flow-meta.xml` para Salesforce.
  - Mermaid normalizado (re-formateado si se desea).
  - Documentación markdown de alto nivel.
- CLI con comandos:
  - `compile` (Mermaid → modelo intermedio → Flow XML).
  - (Opcional) `lint` para validación sin generación.

### 3.2. Out of Scope (v1)

- Manejo detallado de:
  - Loops complejos.
  - Fault connectors.
  - Pausas avanzadas (Wait con todas las variantes).
- Soporte de **todos** los tipos de componentes de Screen.
- Integración directa con metadata del org vía API (v1 puede recibir un dump estático opcional).

---

## 4. HIGH-LEVEL ARCHITECTURE

### 4.1. Components

1. **Diagram Editor (Source Producer)**
   - Puede ser:
     - VS Code con extensión Mermaid.
     - Mermaid Live Web Editor.
     - draw.io / Confluence con bloques Mermaid.
   - Output de referencia: archivo `.mmd` versionado en Git.

2. **CLI `mermaid-flow-compiler`**
   - Implementado idealmente en **Node.js + TypeScript**.
   - Submódulos internos:
     - `MermaidParser`: parsea el archivo `.mmd` a un grafo de nodos/aristas.
     - `MetadataExtractor`: extrae tipo, API name y metadatos desde el contenido de cada nodo.
     - `IntermediateModelBuilder`: construye el **modelo intermedio** (Flow DSL).
     - `Validator`: realiza validaciones estructurales y semánticas.
     - `FlowXmlGenerator`: genera `*.flow-meta.xml`.
     - `DocsGenerator`: genera Mermaid normalizado + markdown.

3. **Intermediate Model (Flow DSL)**
   - JSON/YAML que representa el Flow de manera independiente de Mermaid y de la UI de Flow Builder.
   - Es el formato sobre el que trabajarán agentes y herramientas de análisis.

4. **Salesforce Integration**
   - Se usa la output `*.flow-meta.xml` con:
     - `sfdx force:source:deploy` u otras herramientas (Hardis, Copado, etc.).
   - El Flow se puede revisar y ajustar en Flow Builder si es necesario.

5. **AI Integration (agnostic-ai-pipeline)**
   - Agentes pueden:
     - Leer/editar el `.mmd`.
     - Leer/editar el Flow DSL (JSON/YAML).
     - Sugerir cambios, refactors o tests.

---

## 5. INTERMEDIATE MODEL (FLOW DSL)

### 5.1. Design Principles

- **Declarative**: Describe qué hace el Flow, no cómo se dibuja.
- **Stable diffs**: Cambios de negocio pequeños ⇒ cambios pequeños en el DSL.
- **AI-friendly**:
  - Estructura homogénea.
  - Campos claros, nombres consistentes.
- **Mapeable 1:1** con elementos de Flow en v1.

### 5.2. DSL Skeleton (YAML Example)

The agent must treat this as a **reference schema** for the intermediate model:

```yaml
version: 1
flowApiName: ContactRouting
label: "Contact Routing"
processType: "Flow"          # e.g., Autolaunched, Record-Triggered, Screen (v2)
startElement: Start_1

variables:
  - name: v_HasEmail
    dataType: Boolean
    isCollection: false
    isInput: false
    isOutput: false

elements:
  - id: Start_1
    type: Start
    next: Screen_Collect_Data

  - id: Screen_Collect_Data
    type: Screen
    apiName: Screen_Collect_Data
    label: "Collect Data"
    components:
      - type: "Field"
        name: "EmailInput"
        dataType: "Email"
        target: "$Record.Email__c"
    next: Asg_Set_Flags

  - id: Asg_Set_Flags
    type: Assignment
    apiName: Asg_Set_Flags
    assignments:
      - variable: "v_HasEmail"
        value: "{!NOT(ISBLANK($Record.Email__c))}"
    next: Dec_Has_Email

  - id: Dec_Has_Email
    type: Decision
    apiName: Dec_Has_Email
    label: "Has Email?"
    outcomes:
      - name: "Yes"
        condition: "{!v_HasEmail = TRUE}"
        next: Create_Case
      - name: "No"
        isDefault: true
        next: Screen_Collect_Data

  - id: Create_Case
    type: RecordCreate
    apiName: Create_Case
    object: "Case"
    fields:
      Subject: "New Case"
      SuppliedEmail: "{!$Record.Email__c}"
    next: End_1

  - id: End_1
    type: End
```

The agent should:

- Maintain these field names consistently.
- Extend the schema **evolutivamente** (por ejemplo, agregando más tipos de elementos en futuras versiones).

---

## 6. MERMAID CONVENTIONS (INPUT CONTRACT)

The CLI expects Mermaid diagrams that follow specific conventions so they can be parsed into the DSL.

### 6.1. General Rules

- Use **Mermaid `flowchart`** (e.g. `flowchart TD`).
- Each node represents a **Flow element**.
- The **type** of the element se indica en la primera parte del texto del nodo, en mayúsculas:

  - `START:`, `END:`
  - `SCREEN:`
  - `ASSIGNMENT:`
  - `DECISION:`
  - `CREATE:` (RecordCreate)
  - `UPDATE:` (RecordUpdate)
  - `SUBFLOW:`

- Additional metadata is defined as `clave: valor` on separate lines.

### 6.2. Mermaid Node Examples

```mermaid
flowchart TD
  Start_1([START: Flow Start])

  S1["SCREEN: Collect Data
       api: Screen_Collect_Data
       label: Collect Data"]

  A1["ASSIGNMENT: Set Flags
       api: Asg_Set_Flags
       set: v_HasEmail = NOT(ISBLANK($Record.Email__c))"]

  D1{"DECISION: Has Email?
       api: Dec_Has_Email
       label: Has Email?"}

  C1["CREATE: Case
       api: Create_Case
       object: Case
       fields:
         Subject = 'New Case'
         SuppliedEmail = {!$Record.Email__c}"]

  End_1([END: Flow End])

  Start_1 --> S1
  S1 --> A1
  A1 --> D1
  D1 -->|Yes| C1
  D1 -->|No (default)| S1
  C1 --> End_1
```

### 6.3. Edges / Connectors

- Simple connectors:
  - `NodeA --> NodeB`
- Decision outcomes:
  - `DecisionNode -->|Yes| TargetNode`
  - `DecisionNode -->|No (default)| TargetNode`
- The label between `| |` is mapped to the `outcomes.name` or used to mark a default outcome.

The agent must define a **consistent mapping** between edge labels and the `outcomes` section in the DSL.

---

## 7. CLI DESIGN

### 7.1. CLI Interface (Proposed)

Main command:

```bash
mermaid-flow-compile \
  --input flows/ContactRouting.mmd \
  --out-flow force-app/main/default/flows \
  --out-json .generated/flows \
  --out-docs docs/flows \
  --org-meta .sf-meta/cache.json \
  --strict
```

Parameters:

- `--input`: path to the input `.mmd` Mermaid file.
- `--out-flow`: directory for generated `*.flow-meta.xml`.
- `--out-json`: directory for generated intermediate models (`*.flow.json` or `*.flow.yaml`).
- `--out-docs`: directory for generated documentation (normalized Mermaid + markdown).
- `--org-meta` (optional): path to org metadata dump (objects/fields) for stronger validation.
- `--strict`:
  - If enabled, any warning becomes an error (non-zero exit code).

### 7.2. Internal Workflow

1. **Load**
   - Read the `.mmd` file as text.

2. **Parse**
   - Using a Mermaid-compatible parser or a custom parser, extract:
     - Nodes: `id`, full label text.
     - Edges: `from`, `to`, optional `label`.

3. **Metadata Extraction**
   - For each node:
     - Determine `type` from the first token (`SCREEN`, `ASSIGNMENT`, etc.).
     - Extract `api`, `label`, `object`, `fields`, etc. from subsequent lines.
   - For each edge:
     - If it’s a decision, map edge label to `outcomes`.

4. **Intermediate Model Build**
   - Build the Flow DSL structure:
     - `flowApiName`, `label`, `startElement`.
     - `variables` (if present).
     - `elements` array.

5. **Validation**
   - Structural:
     - At least one `Start` and one `End`.
     - No unreachable nodes.
     - No invalid cycles (unless explicitly allowed).
   - Semantic (basic):
     - Each `Decision` has at least one outcome.
     - Exactly one default outcome.
     - Types are supported in v1.
   - If `--org-meta` is provided:
     - Optionally validate object/field names.

6. **Generation**
   - Generate:
     - Intermediate model file (`.json`/`.yaml`).
     - Flow metadata (`*.flow-meta.xml`).
     - Optional docs:
       - Normalized Mermaid.
       - Markdown summary.

7. **Exit Codes**
   - `0`: success.
   - `1`: validation/parsing errors.
   - `2`: internal errors (exceptions, IO issues, etc.).

---

## 8. DEVELOPMENT & CI WORKFLOW

### 8.1. Local Development

Typical developer flow:

1. Edit Flow diagram in `.mmd` using VS Code or other Mermaid editor.
2. Run CLI locally:

   ```bash
   mermaid-flow-compile \
     --input flows/ContactRouting.mmd \
     --out-flow force-app/main/default/flows \
     --out-json .generated/flows \
     --out-docs docs/flows
   ```

3. Deploy Flow:

   ```bash
   sfdx force:source:deploy -m Flow:ContactRouting
   ```

4. Test Flow in the dev org.

### 8.2. CI / Hardis Integration

- Add a step in CI (GitHub Actions, GitLab CI, etc.):

  ```bash
  mermaid-flow-compile \
    --input flows/**/*.mmd \
    --out-flow force-app/main/default/flows \
    --out-json .generated/flows \
    --out-docs docs/flows \
    --strict
  ```

- If compilation/validation fails, the pipeline fails.
- If all good, proceed to deploy to integration org and run automated tests.

### 8.3. AI Pipeline Integration (agnostic-ai-pipeline)

Roles:

- **Analyst Agent**
  - From business requirements → generates initial `.mmd` Flow diagrams.
- **Architect Agent**
  - Refines the `.mmd`.
  - Optionally edits the Flow DSL directly (`.flow.json`/`.yaml`).
- **Implementor Agent**
  - Invokes the CLI (conceptually or via a command wrapper).
  - Analiza warnings y errores de validación.
- **Reviewer/Tester Agent**
  - Inspects the Flow DSL for:
    - unreachable paths,
    - missing error handling,
    - potential refactors.
  - Suggests test cases.

---

## 9. VALIDATION & TEST STRATEGY

The agent should design tests at three levels:

1. **Unit Tests – Parser & Metadata Extraction**
   - Mermaid snippets for each element type.
   - Mermaid diagrams with intentional syntax/semantic mistakes.
   - Expect: clear error messages and correct mapping to DSL.

2. **Unit Tests – Flow XML Generator**
   - Given a known DSL input, generate Flow XML.
   - Compare against a “golden” `*.flow-meta.xml` file.
   - Ensure minimal/no noise in diffs when making small changes.

3. **Integration Tests**
   - Mermaid → CLI → DSL → Flow XML → deploy to scratch org.
   - Verify:
     - Flow opens correctly in Flow Builder.
     - Basic paths execute as expected.

4. **AI-based Validation (Optional)**
   - Agents read the DSL and produce:
     - Summaries.
     - Risk points.
     - Suggestions for simplification.
   - This does **not** replace structural validation, but complements it.

---

## 10. ROADMAP (HIGH LEVEL)

The agent should consider the evolution in phases:

### Phase 1 – PoC

- Implement a minimal CLI:
  - Support for: `Start`, `End`, `Assignment`, `Decision`.
- Generate a simple Flow XML from a tiny `.mmd`.
- Deploy and open in Flow Builder.

### Phase 2 – v1 Usable

- Add support for:
  - `Screen`, `RecordCreate`, `RecordUpdate`, `Subflow`.
- Add validation rules (structural + basic semantics).
- Integrate into a simple CI pipeline.

### Phase 3 – AI / Developer Experience

- Define JSON Schema/OpenAPI for the DSL.
- Add commands:
  - `mermaid-flow-lint`
  - `mermaid-flow-explain` (generate human-readable summary).
- Deep integration with agnostic-ai-pipeline modules (DSPy/MiPRO).

### Phase 4 – Extensions

- Support more Flow element types (Loops, Waits avanzados, Faults).
- Automatic test case suggestions based on DSL.
- Web-based visualizer/editor for the DSL.

---

## 11. EXPECTED OUTPUTS FROM AGENTS USING THIS SPEC

When asked to design or implement parts of this system, the agent should be able to produce:

1. **Refined specs**:
   - More detailed schemas for DSL.
   - More explicit Mermaid conventions.
2. **CLI skeletons**:
   - TypeScript project structure.
   - Commands and options definitions.
3. **Parser & generator implementations**:
   - Functions/classes to:
     - parse Mermaid,
     - build DSL,
     - validate,
     - generate Flow XML.
4. **Examples & templates**:
   - Sample `.mmd` files.
   - Sample `.flow.yaml`/`.flow.json`.
   - Sample `*.flow-meta.xml` outputs.
5. **CI integration configuration**:
   - GitHub Actions / GitLab CI snippets.
   - Hardis/SFDX examples.

The agent must align all outputs with this spec unless explicitly instructed to deviate.
