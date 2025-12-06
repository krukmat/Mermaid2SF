# Mermaid2SF - Plan de Proyecto Detallado

**Fecha de Creación**: 2025-12-05
**Proyecto**: Mermaid-to-Salesforce Flow Compiler CLI
**Tecnologías**: Node.js, TypeScript, Mermaid, Salesforce Flow Metadata API

---

## RESUMEN EJECUTIVO

### Objetivo del Proyecto
Desarrollar un CLI (`mermaid-flow-compiler`) que transforme diagramas Mermaid en metadatos de Salesforce Flow (`*.flow-meta.xml`), introduciendo un modelo intermedio (Flow DSL) como representación estable y amigable para IA.

### Problema a Resolver
- Los Flows de Salesforce viven dentro del org sin representación textual clara
- Documentación externa se desincroniza rápidamente
- Difícil hacer code review estructural y comparar versiones (diffs)
- Complejo integrar Flows en pipelines de IA

### Solución Propuesta
CLI que implementa pipeline de tres etapas:
```
Mermaid Diagram (.mmd) → Flow DSL (JSON/YAML) → Salesforce Flow XML
```

### Entregables Principales
1. CLI funcional con comandos `compile` y `lint`
2. Modelo intermedio (Flow DSL) estable y versionable
3. Generadores de Flow XML + documentación
4. Suite de tests (unit + integration)
5. Integración con CI/CD y agnostic-ai-pipeline

---

## Ajustes tras contraste con mermaid-flow-compiler-architecture.md
- Salida determinista y diffs mínimos: ordenar nodos, outcomes y variables en Builder/Generators/Docs (Tasks 1.4, 1.6, 2.4) y validar contra golden files.
- DSL en JSON o YAML: el CLI debe permitir `--dsl-format json|yaml` o extensión del `--out-json` (Tasks 1.7, 2.5) para alinearse al contrato `.flow.json/.flow.yaml`.
- processType y apiVersion: usar constantes alineadas a metadata (`Flow`, `AutolaunchedFlow`, `RecordTriggeredFlow`) y fijar `apiVersion=60.0` configurable (Tasks 1.1, 1.6).
- Docs y convenciones desde PoC: adelantar `--out-docs` básico (Mermaid normalizado + markdown resumido) a la Fase 1 (Tasks 1.7/1.8) y mover la guía de convenciones Mermaid a entregable del PoC.
- Re-evaluación de extras: Interactive CLI, plugin system y web editor (Tasks 3.3, 3.4.5, 4.2, 4.3) quedan como opcionales post-v1; requerir checkpoint antes de iniciarlos.
- Validación opcional con org metadata: mantener `--org-meta` como opt-in y planificar mocks para tests (Tasks 2.3, 2.5.4) sin bloquear compilaciones base.

---

## FASES DEL PROYECTO

### FASE 1 - PoC (Proof of Concept)
**Duración Estimada**: Sprint 1-2
**Objetivo**: Validar viabilidad técnica con elementos básicos

### FASE 2 - v1 Usable
**Duración Estimada**: Sprint 3-6
**Objetivo**: CLI funcional con elementos completos y validaciones

### FASE 3 - AI/Developer Experience
**Duración Estimada**: Sprint 7-9
**Objetivo**: Integración profunda con IA y mejora de DX

### FASE 4 - Extensions
**Duración Estimada**: Sprint 10+
**Objetivo**: Elementos avanzados y herramientas adicionales

---

## TAREAS DETALLADAS POR FASE

---

## FASE 1 - PROOF OF CONCEPT (PoC)

### **TASK 1.0: Project Setup & Infrastructure**
**Estado**: ✅ Completed
**Archivos afectados**: Raíz del proyecto

#### Subtareas:

**1.0.1: Inicializar proyecto Node.js + TypeScript**
- [x] Ejecutar `npm init -y`
- [x] Instalar TypeScript: `npm install -D typescript @types/node`
- [x] Crear `tsconfig.json` con configuración estricta
  - Target: ES2020
  - Module: CommonJS
  - Strict mode enabled
  - Source maps enabled
  - OutDir: `./dist`
  - RootDir: `./src`
- [x] Agregar scripts en `package.json`:
  - `build`: `tsc`
  - `dev`: `tsc --watch`
  - `clean`: `rm -rf dist`

**1.0.2: Configurar ESLint + Prettier**
- [x] Instalar: `npm install -D eslint prettier eslint-config-prettier`
- [x] Crear `.eslintrc.js` con reglas TypeScript
- [x] Crear `.prettierrc` con reglas de formato
- [x] Agregar scripts:
  - `lint`: `eslint src/**/*.ts`
  - `format`: `prettier --write src/**/*.ts`

**1.0.3: Configurar Jest para testing**
- [x] Instalar: `npm install -D jest @types/jest ts-jest`
- [x] Crear `jest.config.js` para TypeScript
- [x] Crear carpeta `src/__tests__/`
- [x] Agregar scripts:
  - `test`: `jest`
  - `test:watch`: `jest --watch`
  - `test:coverage`: `jest --coverage`

**1.0.4: Configurar estructura de carpetas**
- [x] Crear estructura base:
  ```
  src/
  ├── cli/
  ├── parser/
  ├── extractor/
  ├── dsl/
  ├── validator/
  ├── generators/
  ├── types/
  └── utils/
  ```
- [x] Crear carpetas auxiliares:
  ```
  examples/
  docs/
  ```

**1.0.5: Configurar Git y .gitignore**
- [x] Inicializar Git: `git init`
- [x] Crear `.gitignore`:
  - node_modules/
  - dist/
  - .generated/
  - coverage/
  - *.log
- [x] Crear README.md básico con instrucciones de setup

---

### **TASK 1.1: Type Definitions & Core Interfaces**
**Estado**: ✅ Completed
**Archivos afectados**: `src/types/`

#### Subtareas:

**1.1.1: Definir tipos para grafo Mermaid**
- [ ] Crear `src/types/mermaid.ts`
- [ ] Definir interfaces:
  ```typescript
  interface MermaidNode {
    id: string;
    label: string;
    shape: string; // (), [], {}, etc.
  }

  interface MermaidEdge {
    from: string;
    to: string;
    label?: string;
  }

  interface MermaidGraph {
    direction: 'TD' | 'LR' | 'TB' | 'RL';
    nodes: MermaidNode[];
    edges: MermaidEdge[];
  }
  ```

**1.1.2: Definir tipos para Flow DSL (Modelo Intermedio)**
- [ ] Crear `src/types/flow-dsl.ts`
- [ ] Definir tipos base:
  ```typescript
  type ElementType = 'Start' | 'End' | 'Assignment' | 'Decision' |
                     'Screen' | 'RecordCreate' | 'RecordUpdate' | 'Subflow';

  interface FlowVariable {
    name: string;
    dataType: string;
    isCollection: boolean;
    isInput: boolean;
    isOutput: boolean;
  }

  interface BaseElement {
    id: string;
    type: ElementType;
    apiName?: string;
    label?: string;
    next?: string;
  }
  ```

**1.1.3: Definir tipos específicos por elemento (PoC: Start, End, Assignment, Decision)**
- [ ] Crear interfaces para cada tipo:
  ```typescript
  interface StartElement extends BaseElement {
    type: 'Start';
  }

  interface EndElement extends BaseElement {
    type: 'End';
  }

  interface AssignmentElement extends BaseElement {
    type: 'Assignment';
    assignments: Array<{
      variable: string;
      value: string;
    }>;
  }

  interface DecisionOutcome {
    name: string;
    condition?: string;
    isDefault?: boolean;
    next: string;
  }

  interface DecisionElement extends BaseElement {
    type: 'Decision';
    outcomes: DecisionOutcome[];
  }
  ```

**1.1.4: Definir tipo FlowDSL completo**
- [ ] Crear tipo raíz:
  ```typescript
  interface FlowDSL {
    version: number;
    flowApiName: string;
    label: string;
    processType: 'Autolaunched' | 'RecordTriggered' | 'Screen';
    startElement: string;
    variables?: FlowVariable[];
    elements: FlowElement[];
  }

  type FlowElement = StartElement | EndElement | AssignmentElement | DecisionElement;
  ```

**1.1.5: Definir tipos para metadatos extraídos**
- [ ] Crear `src/types/metadata.ts`
- [ ] Definir:
  ```typescript
  interface ExtractedMetadata {
    type: ElementType;
    apiName?: string;
    label?: string;
    properties: Record<string, any>;
  }
  ```

---

### **TASK 1.2: MermaidParser - Parse Mermaid Text**
**Estado**: ✅ Completed
**Archivos afectados**: `src/parser/mermaid-parser.ts`

#### Subtareas:

**1.2.1: Implementar parser básico de texto Mermaid**
- [ ] Crear clase `MermaidParser`
- [ ] Método `parse(text: string): MermaidGraph`
- [ ] Detectar dirección del flowchart (TD, LR, etc.)
- [ ] Extraer líneas que definen nodos y edges

**1.2.2: Extraer nodos del diagrama**
- [ ] Parsear líneas de nodos:
  - Formato: `NodeId([Label])`, `NodeId[Label]`, `NodeId{Label}`
- [ ] Detectar shape según delimitadores
- [ ] Guardar id y label completo (multi-línea si aplica)

**1.2.3: Extraer edges del diagrama**
- [ ] Parsear líneas de conexiones:
  - Simple: `A --> B`
  - Con label: `A -->|Label| B`
- [ ] Manejar diferentes tipos de arrows:
  - `-->`, `-.->`, `==>`
- [ ] Guardar from, to, optional label

**1.2.4: Tests unitarios para MermaidParser**
- [ ] Test: parsear diagrama vacío (debe fallar)
- [ ] Test: parsear diagrama con 2 nodos y 1 edge
- [ ] Test: parsear nodos con diferentes shapes
- [ ] Test: parsear edges con labels
- [ ] Test: parsear diagrama multi-línea
- [ ] Test: manejo de errores con sintaxis inválida

**1.2.5: Manejo de errores y validaciones**
- [ ] Validar que existe `flowchart` keyword
- [ ] Detectar nodos huérfanos
- [ ] Detectar edges a nodos inexistentes
- [ ] Mensajes de error claros con número de línea

---

### **TASK 1.3: MetadataExtractor - Extract Metadata from Nodes**
**Estado**: ✅ Completed
**Archivos afectados**: `src/extractor/metadata-extractor.ts`

#### Subtareas:

**1.3.1: Implementar extractor de tipo de elemento**
- [ ] Crear clase `MetadataExtractor`
- [ ] Método `extractType(label: string): ElementType`
- [ ] Detectar prefijos: `START:`, `END:`, `ASSIGNMENT:`, `DECISION:`
- [ ] Manejar case-insensitive
- [ ] Retornar error si tipo no reconocido

**1.3.2: Extraer API name y label**
- [ ] Parsear líneas con formato `api: value`
- [ ] Parsear líneas con formato `label: value`
- [ ] Generar API name automático si no existe (basado en label)
- [ ] Validar que API name cumple reglas Salesforce (alphanumeric + underscore)

**1.3.3: Extraer metadata específica para Assignment**
- [ ] Parsear líneas con formato `set: variable = expression`
- [ ] Parsear múltiples assignments en un solo nodo
- [ ] Validar sintaxis de expresiones Salesforce (básico)

**1.3.4: Extraer metadata específica para Decision**
- [ ] Parsear outcomes desde edges con labels
- [ ] Detectar outcome por default: `|No (default)|`
- [ ] Extraer condición de cada outcome
- [ ] Validar que hay exactamente un outcome default

**1.3.5: Tests unitarios para MetadataExtractor**
- [ ] Test: extraer tipo de cada elemento PoC
- [ ] Test: extraer api + label
- [ ] Test: generar API name automático
- [ ] Test: extraer assignments
- [ ] Test: extraer decision outcomes
- [ ] Test: manejo de metadata inválida

---

### **TASK 1.4: IntermediateModelBuilder - Build Flow DSL**
**Estado**: ✅ Completed
**Archivos afectados**: `src/dsl/intermediate-model-builder.ts`

#### Subtareas:

**1.4.1: Implementar builder de DSL**
- [ ] Crear clase `IntermediateModelBuilder`
- [ ] Método `build(graph: MermaidGraph, metadata: Map): FlowDSL`
- [ ] Construir estructura básica del FlowDSL
- [ ] Detectar startElement (primer nodo START)

**1.4.2: Convertir nodos a elementos DSL**
- [ ] Iterar sobre nodos del grafo
- [ ] Usar metadata extraída para crear elementos
- [ ] Mapear tipos de nodo a tipos de elemento
- [ ] Preservar orden topológico si es posible

**1.4.3: Conectar elementos según edges**
- [ ] Mapear edges simples a `next` property
- [ ] Mapear edges de Decision a `outcomes[].next`
- [ ] Validar que cada elemento apunta a elemento existente

**1.4.4: Inferir variables automáticamente (opcional PoC)**
- [ ] Detectar variables usadas en assignments
- [ ] Crear entradas en `variables` array
- [ ] Inferir dataType básico (String, Boolean, etc.)

**1.4.5: Tests unitarios para IntermediateModelBuilder**
- [ ] Test: construir DSL con Start → End
- [ ] Test: construir DSL con Start → Assignment → End
- [ ] Test: construir DSL con Decision y outcomes
- [ ] Test: validar conexiones correctas
- [ ] Test: inferencia de variables

---

### **TASK 1.5: Validator - Basic Structural Validation**
**Estado**: ✅ Completed
**Archivos afectados**: `src/validator/flow-validator.ts`

#### Subtareas:

**1.5.1: Implementar validador estructural**
- [ ] Crear clase `FlowValidator`
- [ ] Método `validate(dsl: FlowDSL): ValidationResult`
- [ ] Definir tipo `ValidationResult` con errors y warnings

**1.5.2: Validar existencia de Start y End**
- [ ] Verificar que hay exactamente 1 elemento Start
- [ ] Verificar que hay al menos 1 elemento End
- [ ] Error si no cumple

**1.5.3: Validar conectividad y alcanzabilidad**
- [ ] Verificar que todos los elementos son alcanzables desde Start
- [ ] Detectar nodos huérfanos
- [ ] Warning si hay elementos inalcanzables

**1.5.4: Validar Decision elements**
- [ ] Verificar que tiene al menos 1 outcome
- [ ] Verificar que hay exactamente 1 outcome default
- [ ] Verificar que todos los outcomes tienen next válido

**1.5.5: Tests unitarios para Validator**
- [ ] Test: flow válido simple
- [ ] Test: flow sin Start (error)
- [ ] Test: flow sin End (error)
- [ ] Test: nodos inalcanzables (warning)
- [ ] Test: Decision sin default (error)
- [ ] Test: Decision con múltiples defaults (error)

---

### **TASK 1.6: FlowXmlGenerator - Generate Salesforce Flow XML (Minimal)**
**Estado**: ✅ Completed
**Archivos afectados**: `src/generators/flow-xml-generator.ts`

#### Subtareas:

**1.6.1: Implementar generador XML base**
- [ ] Crear clase `FlowXmlGenerator`
- [ ] Método `generate(dsl: FlowDSL): string`
- [ ] Generar estructura XML base de Flow:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>60.0</apiVersion>
    <label>...</label>
    <processType>...</processType>
    <start>...</start>
    ...
  </Flow>
  ```

**1.6.2: Generar XML para Start element**
- [ ] Crear método `generateStart(elem: StartElement): string`
- [ ] Generar XML según Salesforce metadata format
- [ ] Incluir connector a siguiente elemento

**1.6.3: Generar XML para Assignment element**
- [ ] Crear método `generateAssignment(elem: AssignmentElement): string`
- [ ] Generar `<assignments>` para cada asignación
- [ ] Mapear variables y expresiones a formato Salesforce

**1.6.4: Generar XML para Decision element**
- [ ] Crear método `generateDecision(elem: DecisionElement): string`
- [ ] Generar `<rules>` para cada outcome
- [ ] Generar `<conditions>` para cada rule
- [ ] Marcar default rule correctamente

**1.6.5: Tests unitarios para FlowXmlGenerator**
- [ ] Test: generar XML de flow simple
- [ ] Test: validar XML es bien formado
- [ ] Test: comparar contra "golden file" reference
- [ ] Test: verificar que diffs son mínimos en cambios pequeños

---

### **TASK 1.7: CLI Implementation (Minimal)**
**Estado**: ✅ Completed
**Archivos afectados**: `src/cli/index.ts`, `src/cli/commands/compile.ts`

#### Subtareas:

**1.7.1: Setup CLI framework**
- [ ] Instalar: `npm install commander`
- [ ] Crear `src/cli/index.ts` como entry point
- [ ] Configurar shebang: `#!/usr/bin/env node`
- [ ] Agregar bin entry en package.json:
  ```json
  "bin": {
    "mermaid-flow-compile": "./dist/cli/index.js"
  }
  ```

**1.7.2: Implementar comando compile (básico)**
- [ ] Crear `src/cli/commands/compile.ts`
- [ ] Definir opciones:
  - `--input <path>`: Mermaid file path
  - `--out-flow <dir>`: Output directory for Flow XML
  - `--out-json <dir>`: Output directory for DSL JSON
- [ ] Parsear argumentos con commander

**1.7.3: Implementar workflow de compilación**
- [ ] Leer archivo Mermaid desde `--input`
- [ ] Ejecutar pipeline:
  1. MermaidParser.parse()
  2. MetadataExtractor.extract()
  3. IntermediateModelBuilder.build()
  4. FlowValidator.validate()
  5. FlowXmlGenerator.generate()
- [ ] Escribir outputs a directorios especificados

**1.7.4: Implementar manejo de errores**
- [ ] Capturar errores de cada etapa
- [ ] Mostrar mensajes claros al usuario
- [ ] Exit codes:
  - 0: success
  - 1: validation errors
  - 2: internal errors

**1.7.5: Agregar logging básico**
- [ ] Instalar: `npm install winston`
- [ ] Configurar logger en `src/utils/logger.ts`
- [ ] Log de cada etapa del pipeline
- [ ] Modo verbose con `--verbose` flag

**1.7.6: Tests de integración CLI**
- [ ] Test: compilar ejemplo simple end-to-end
- [ ] Test: error en input inválido
- [ ] Test: verificar outputs generados

---

### **TASK 1.8: Integration Test - PoC End-to-End**
**Estado**: ✅ Completed
**Archivos afectados**: `examples/`, `src/__tests__/integration/`

#### Subtareas:

**1.8.1: Crear ejemplo Mermaid simple**
- [ ] Crear `examples/poc/simple-flow.mmd`:
  ```mermaid
  flowchart TD
    Start([START: Flow Start])
    Assign["ASSIGNMENT: Set Flag
             api: Asg_Set_Flag
             set: v_Flag = true"]
    Decision{"DECISION: Check Flag
              api: Dec_Check_Flag"}
    End1([END: Success])
    End2([END: Failure])

    Start --> Assign
    Assign --> Decision
    Decision -->|Yes| End1
    Decision -->|No (default)| End2
  ```

**1.8.2: Crear "golden file" XML esperado**
- [ ] Crear `examples/poc/simple-flow.flow-meta.xml`
- [ ] XML válido según Salesforce Flow metadata
- [ ] Debe ser deployable a scratch org

**1.8.3: Implementar test de integración**
- [ ] Test compila `simple-flow.mmd`
- [ ] Genera DSL JSON
- [ ] Genera Flow XML
- [ ] Compara XML generado vs golden file
- [ ] Pasa validación estructural

**1.8.4: Validar en Salesforce (manual para PoC)**
- [ ] Crear scratch org
- [ ] Deploy Flow generado
- [ ] Abrir en Flow Builder
- [ ] Verificar que estructura es correcta
- [ ] Verificar que se puede ejecutar

**1.8.5: Documentar resultado PoC**
- [ ] Crear `docs/poc-results.md`
- [ ] Screenshots de Flow Builder
- [ ] Notas sobre limitaciones encontradas
- [ ] Recomendaciones para v1

---

## FASE 2 - V1 USABLE

### **TASK 2.0: Extend Type System for All v1 Elements**
**Estado**: ✅ Completed
**Archivos afectados**: `src/types/flow-dsl.ts`

#### Subtareas:

**2.0.1: Definir tipos para Screen element**
- [x] Crear `ScreenElement` interface
- [x] Definir `ScreenComponent` types
- [x] Soporte para Field, Display Text (básico)
- [x] Mapeo de componentes a targets

**2.0.2: Definir tipos para RecordCreate element**
- [x] Crear `RecordCreateElement` interface
- [x] Definir estructura de fields
- [x] Soporte para object type
- [x] Soporte para recordId output

**2.0.3: Definir tipos para RecordUpdate element**
- [x] Crear `RecordUpdateElement` interface
- [x] Soporte para filters/conditions
- [x] Soporte para field updates

**2.0.4: Definir tipos para Subflow element**
- [x] Crear `SubflowElement` interface
- [x] Soporte para flowName reference
- [x] Input/output variables mapping

**2.0.5: Actualizar FlowElement union type**
- [x] Agregar nuevos tipos a union
- [x] Actualizar documentación de tipos
- [x] Crear helpers de type guards

---

### **TASK 2.1: Extend MetadataExtractor for All v1 Elements**
**Estado**: ✅ Completed
**Archivos afectados**: `src/extractor/metadata-extractor.ts`

#### Subtareas:

**2.1.1: Extraer metadata para Screen**
- [x] Parsear `components:` block
- [x] Extraer tipo de componente (Field, Display, etc.)
- [x] Extraer target binding
- [x] Validar estructura de componentes

**2.1.2: Extraer metadata para RecordCreate**
- [x] Parsear `object: ObjectName`
- [x] Parsear `fields:` block con asignaciones
- [x] Extraer storeOutputAutomatically config
- [x] Validar object name format

**2.1.3: Extraer metadata para RecordUpdate**
- [x] Parsear filters/conditions
- [x] Parsear field updates
- [x] Extraer mode (update single vs all)

**2.1.4: Extraer metadata para Subflow**
- [x] Parsear flow name reference
- [x] Parsear input variable mappings
- [x] Parsear output variable mappings

**2.1.5: Tests para nuevos extractors**
- [x] Test por cada tipo de elemento
- [x] Test casos edge (metadata incompleta)
- [x] Test validaciones

---

### **TASK 2.2: Extend FlowXmlGenerator for All v1 Elements**
**Estado**: ✅ Completed
**Archivos afectados**: `src/generators/flow-xml-generator.ts`

#### Subtareas:

**2.2.1: Generar XML para Screen**
- [x] Implementar `generateScreen()`
- [x] Generar `<fields>` para cada componente
- [x] Mapear component types a XML elements
- [x] Incluir allowBack/allowFinish config

**2.2.2: Generar XML para RecordCreate**
- [x] Implementar `generateRecordCreate()`
- [x] Generar `<inputAssignments>` por field
- [x] Configurar object reference
- [x] Configurar storeOutputAutomatically

**2.2.3: Generar XML para RecordUpdate**
- [x] Implementar `generateRecordUpdate()`
- [x] Generar filters
- [x] Generar inputAssignments
- [x] Configurar update mode

**2.2.4: Generar XML para Subflow**
- [x] Implementar `generateSubflow()`
- [x] Generar flowName reference
- [x] Generar inputAssignments
- [x] Generar outputAssignments

**2.2.5: Tests unitarios y golden files**
- [x] Crear golden files por cada elemento
- [x] Tests de comparación XML
- [x] Tests de minimal diffs

---

### **TASK 2.3: Enhanced Validation (Semantic)**
**Estado**: ✅ Completed
**Archivos afectados**: `src/validator/flow-validator.ts`, `src/validator/semantic-validator.ts`

#### Subtareas:

**2.3.1: Validar referencias a variables**
- [x] Detectar variables usadas pero no declaradas
- [x] Warning si variable declarada no usada
- [x] Validar scope de variables

**2.3.2: Validar referencias a objetos (opcional con org-meta)**
- [x] Si `--org-meta` provisto, cargar metadata
- [x] Validar que objetos existen
- [x] Validar que fields existen en objeto
- [x] Validar tipos de datos compatibles

**2.3.3: Validar expresiones Salesforce (básico)**
- [x] Verificar sintaxis de fórmulas
- [x] Detectar funciones no válidas
- [x] Verificar paréntesis balanceados

**2.3.4: Validar ciclos y loops**
- [x] Detectar ciclos infinitos potenciales
- [x] Warning si Decision puede loop sin exit
- [x] Validar límites de iteración (cuando aplique)

**2.3.5: Tests para validaciones semánticas**
- [x] Test variable undefined
- [x] Test object field invalid
- [x] Test expression syntax error
- [x] Test infinite loop detection

---

### **TASK 2.4: DocsGenerator - Generate Documentation**
**Estado**: ✅ Completed
**Archivos afectados**: `src/generators/docs-generator.ts`

#### Subtareas:

**2.4.1: Implementar generador de Mermaid normalizado**
- [x] Crear clase `DocsGenerator`
- [x] Método `generateMermaid(dsl: FlowDSL): string`
- [x] Generar Mermaid formateado consistentemente
- [x] Preservar metadata importante en labels

**2.4.2: Implementar generador de Markdown**
- [x] Método `generateMarkdown(dsl: FlowDSL): string`
- [x] Generar tabla de elementos
- [x] Generar descripción de variables
- [x] Generar diagrama de flujo embebido

**2.4.3: Generar documentación de Decision paths**
- [x] Listar todos los outcomes posibles
- [x] Documentar condiciones
- [x] Identificar paths críticos

**2.4.4: Template system para docs**
- [x] Crear templates en `src/templates/`
- [x] Template para markdown
- [x] Variables interpolables
- [x] Soporte para custom templates

**2.4.5: Tests para DocsGenerator**
- [x] Test generación Mermaid
- [x] Test generación Markdown
- [x] Test templates customizados
- [x] Verificar formato consistente

---

### **TASK 2.5: CLI Enhancement - Complete Command Set**
**Estado**: ✅ Completed
**Archivos afectados**: `src/cli/commands/`

#### Subtareas:

**2.5.1: Agregar comando lint**
- [x] Crear `src/cli/commands/lint.ts`
- [x] Ejecutar parsing + validation sin generar output
- [x] Mostrar warnings y errors
- [x] Exit code 1 si hay errors

**2.5.2: Agregar flag --strict a compile**
- [x] Implementar modo strict
- [x] Warnings se convierten en errors
- [x] Exit code 1 si hay cualquier issue

**2.5.3: Agregar flag --out-docs**
- [x] Opción para especificar dir de docs
- [x] Generar Mermaid normalizado
- [x] Generar Markdown summary
- [x] Integrar DocsGenerator

**2.5.4: Agregar flag --org-meta**
- [x] Cargar archivo JSON de metadata del org
- [x] Pasar a validators para validación semántica
- [x] Error claro si archivo no existe

**2.5.5: Mejorar CLI help y examples**
- [x] Agregar ejemplos en help text
- [x] Documentar todas las flags
- [x] Crear `--version` flag
- [x] Crear `--help` mejorado

**2.5.6: Tests CLI completo**
- [x] Test lint command
- [x] Test strict mode
- [x] Test org-meta integration
- [x] Test all flags combination

---

### **TASK 2.6: Examples & Documentation**
**Estado**: ✅ Completed
**Archivos afectados**: `examples/`, `docs/`

#### Subtareas:

**2.6.1: Crear ejemplos para cada elemento v1**
- [x] Screen example
- [x] RecordCreate example
- [x] RecordUpdate example
- [x] Subflow example
- [x] Combined flow example

**2.6.2: Crear guía de Mermaid conventions**
- [x] Documentar formato de cada elemento
- [x] Ejemplos de metadata syntax
- [x] Common patterns
- [x] Best practices

**2.6.3: Crear guía de Flow DSL schema**
- [x] Documentar estructura JSON/YAML
- [x] Describir cada field
- [x] Ejemplos completos
- [x] JSON Schema definition (opcional)

**2.6.4: Crear guía de integración CI/CD**
- [x] Ejemplo GitHub Actions
- [x] Ejemplo GitLab CI
- [x] Integración con SFDX
- [x] Integración con Hardis

**2.6.5: Crear troubleshooting guide**
- [x] Common errors y soluciones
- [x] Tips de debugging
- [x] FAQ

---

### **TASK 2.7: Integration Tests - All Elements**
**Estado**: ✅ Completed
**Archivos afectados**: `src/__tests__/integration/`, `examples/v1/`

#### Subtareas:

**2.7.1: Test Screen flow**
- [x] Crear ejemplo con Screen elements
- [x] Compilar a XML
- [x] Validar contra golden file
- [x] Deploy a scratch org (manual/automated)

**2.7.2: Test RecordCreate flow**
- [x] Ejemplo con create de múltiples objetos
- [x] Validar field mappings
- [x] Deploy y test execution

**2.7.3: Test RecordUpdate flow**
- [x] Ejemplo con updates condicionales
- [x] Validar filters
- [x] Deploy y test execution

**2.7.4: Test Subflow invocation**
- [x] Crear flow padre + subflow
- [x] Validar variable passing
- [x] Deploy ambos y test execution

**2.7.5: Test flow complejo combinado**
- [x] Flow usando todos los elementos v1
- [x] Múltiples decision paths
- [x] Validación end-to-end
- [x] Performance test (compilación rápida)

**2.7.6: Automated scratch org testing (opcional)**
- [x] Script para crear scratch org
- [x] Deploy automático de flows generados
- [x] Ejecutar flows con test data
- [x] Validar resultados
- [x] Teardown scratch org

---

### **TASK 2.8: CI/CD Integration**
**Estado**: ⬜ Pending (dejar para después)
**Archivos afectados**: `.github/workflows/`, `.gitlab-ci.yml`

#### Subtareas:

**2.8.1: Configurar GitHub Actions**
- [ ] Crear `.github/workflows/ci.yml`
- [ ] Job: lint & test
- [ ] Job: build
- [ ] Job: compile examples
- [ ] Job: validate generated XML
- [ ] Artifacts: compiled flows

**2.8.2: Configurar pre-commit hooks**
- [ ] Instalar husky
- [ ] Hook: lint staged files
- [ ] Hook: run affected tests
- [ ] Hook: format code

**2.8.3: Agregar badge de CI al README**
- [ ] Badge de build status
- [ ] Badge de coverage
- [ ] Badge de version

**2.8.4: Configurar GitLab CI (opcional)**
- [ ] Crear `.gitlab-ci.yml`
- [ ] Stages: test, build, deploy
- [ ] Integration con GitLab artifacts

**2.8.5: Tests de CI pipeline**
- [ ] Verificar que pipeline corre en PR
- [ ] Verificar que falla con errores
- [ ] Verificar que artifacts se generan

---

## FASE 3 - AI/DEVELOPER EXPERIENCE

### **TASK 3.0: JSON Schema & OpenAPI for DSL**
**Estado**: ✅ Completada
**Archivos afectados**: `schemas/`, `src/validator/schema-validator.ts`, `.vscode/settings.json`
**Documentación**: Ver `docs/TASK_3.0_REVIEW.md` para análisis completo

#### Subtareas:

**3.0.1: Generar JSON Schema del Flow DSL** ✅
- [x] Crear `schemas/flow-dsl.schema.json` (276 líneas)
- [x] Schema para FlowDSL root
- [x] Schema para cada ElementType (8 tipos)
- [x] Validations y constraints

**3.0.2: Configurar validación automática con schema** ✅
- [x] Instalar: `npm install ajv` (agregado a package.json)
- [x] Implementar `SchemaValidator` con AJV
- [x] Mensajes de error mejorados y descriptivos
- [x] Tests: 29 tests (100% passing)

**3.0.3: Generar OpenAPI spec** ⬜
- [ ] Opcional - Solo si se implementa web service
- [ ] No requerido para CLI actual

**3.0.4: VSCode schema integration** ✅
- [x] Configurar `.vscode/settings.json` para `*.flow.json`
- [x] Autocomplete en DSL files
- [x] Validación inline en editor
- [x] Documentado en README.md

---

### **TASK 3.1: Command - Explain**
**Estado**: ✅ Completed (MEJORADO - 2025-12-06)
**Archivos afectados**:
- `src/cli/commands/explain.ts` (280 líneas)
- `src/__tests__/explain.test.ts` (284 líneas, 15 tests)
- `README.md` (documentación completa del comando)

**Objetivo**: Implementar comando `explain` para analizar flows y generar reportes sobre estructura, complejidad y recomendaciones.

**Comando CLI**:
```bash
mermaid-flow-compile explain --input my-flow.mmd [--format text|json|html] [--strict] [--verbose]
```

#### Subtareas:

**3.1.1: Implementar comando explain** ✅ COMPLETO
- [x] Crear `src/cli/commands/explain.ts`
- [x] Input: Mermaid or DSL file (.mmd, .json, .yaml, .yml)
- [x] Generar human-readable summary
- [x] Describir propósito del flow
- [x] Opciones: --format, --strict, --verbose
- [x] Documentado en README.md

**3.1.2: Generar análisis de complejidad** ✅ COMPLETO + MEJORADO
- [x] Contar elementos por tipo (8 tipos diferentes)
- [x] Calcular complejidad ciclomática: M = (decisiones) + 1
- [x] **NUEVO**: Complexity scoring (LOW/MEDIUM/HIGH/VERY_HIGH) basado en cyclomatic
  - LOW: < 5
  - MEDIUM: 5-9
  - HIGH: 10-19
  - VERY_HIGH: >= 20
- [x] Identificar paths críticos de forma básica (conteo de outcomes)
- [x] Detectar variables no utilizadas vía validator
- [x] Test de cyclomatic complexity con flow complejo (6 decisiones)

**3.1.3: Generar recomendaciones** ✅ COMPLETO + MEJORADO
- [x] **NUEVO - CRITICAL**: Flow sin End element
- [x] **NUEVO - CRITICAL**: Errores de validación presentes
- [x] **NUEVO - HIGH**: Complexity VERY_HIGH (sugerir subflows)
- [x] **NUEVO - HIGH**: Complexity HIGH (revisar logic)
- [x] **NUEVO - MEDIUM**: Flows grandes (>15 elementos)
- [x] MEDIUM: Muchas decisiones (>5)
- [x] LOW: Variables no declaradas
- [x] **MEJORADO - LOW**: Warnings de validación con contador
- [x] Feedback positivo cuando no hay issues
- [x] 5 tests específicos de recomendaciones

**3.1.4: Output formats** ✅ COMPLETO + MEJORADO
- [x] TextFormatter (plain text con complexity level)
- [x] JsonFormatter (JSON structured con complexityLevel)
- [x] HtmlFormatter (HTML con sección de Complexity dedicada)
- [x] 3 tests de rendering (JSON, text, HTML)

**3.1.5: Tests para explain** ✅ COMPLETO + AMPLIADO
- [x] **15 tests totales** (vs 2 originales)
- [x] 4 tests de summarizeFlow (vs 1 original)
  - Summary básico
  - Cyclomatic complexity con flow complejo
  - Conteo de elementos
  - Errores y warnings
- [x] 3 tests de output formats
  - JSON format
  - Text format
  - HTML format
- [x] 4 tests de recommendation engine
  - Flows complejos (>5 decisions)
  - Variables no definidas
  - Warnings presentes
  - No issues (feedback positivo)
- [x] 4 tests de loadDsl
  - Load desde .mmd
  - Load desde .json
  - Error en formato no soportado
  - Error en archivo inexistente

**Líneas de código**:
- Implementación: 280 líneas
- Tests: 284 líneas
- Ratio test/código: ~1:1 (excelente)

---

### **TASK 3.2: AI Pipeline Integration - DSPy/MiPRO**
**Estado**: 🚫 BLOQUEADA - Dependencia Externa (No implementar)
**Decisión**: 2025-12-06 - Integración Reversa Recomendada
**Análisis Detallado**: Ver `docs/TASK_3.2_ANALYSIS.md`
**Archivos afectados**: NINGUNO (tarea pospuesta indefinidamente)

#### ⚠️ DECISIÓN ARQUITECTURAL IMPORTANTE

Esta tarea requiere integración con un **proyecto externo** (`agnostic-ai-pipeline`) que:
- ❌ NO existe en este repositorio
- ❌ NO está bajo nuestro control
- ❌ Requeriría acoplamiento tight innecesario

**RECOMENDACIÓN**: Implementar integración **EN REVERSA**
- ✅ El proyecto `agnostic-ai-pipeline` debe invocar este CLI como herramienta
- ✅ Este CLI ya provee todo lo necesario: `compile`, `lint`, `explain`
- ✅ Interface CLI es suficiente para consumidores externos
- ✅ Zero coupling, máxima flexibilidad

**Razones para NO implementar aquí**:
1. Proyecto externo separado y no disponible
2. Acoplamiento innecesario con DSPy/MiPRO
3. CLI debe ser agnóstico de sus consumidores
4. Scope creep: CLI es compilador, no plataforma AI
5. Dependencias pesadas (LLMs, training datasets)
6. Testing complejo (mockear LLMs)

**Lo que YA está listo para agentes externos**:
- ✅ CLI con 3 comandos: `compile`, `lint`, `explain`
- ✅ Outputs estructurados (JSON, text, HTML)
- ✅ Exit codes estándares (0=success, 1=validation, 2=error)
- ✅ DSL JSON estable y versionado
- ✅ JSON Schema para validación
- ✅ Documentación completa

**Acción alternativa**: Crear documentación de integración
- [ ] Crear `docs/INTEGRATION_GUIDE.md`
- [ ] Crear ejemplos en `docs/integration-examples/`
  - [ ] Python wrapper example
  - [ ] Node.js wrapper example
  - [ ] Shell script example
- [ ] Documentar CLI contract (exit codes, outputs, errors)

**Cuándo reconsiderar**:
- Solo si `agnostic-ai-pipeline` existe y está maduro
- Solo si hay caso de uso que requiere tight integration
- Solo si se puede mantener loose coupling

**Próximos pasos recomendados**:
- ✅ Continuar con TASK 3.4 (DX Improvements)
- ✅ Continuar con TASK 2.8 (CI/CD Integration)
- ⬜ Crear guías de integración para consumidores externos

#### Subtareas (NO IMPLEMENTAR - Solo referencia)

**3.2.1: Definir interfaces para AI agents** ❌ BLOQUEADO
- [ ] ~~Analyst Agent: requirements → Mermaid~~ (Proyecto externo)
- [ ] ~~Architect Agent: refine Mermaid/DSL~~ (Proyecto externo)
- [ ] ~~Implementor Agent: invoke CLI, handle errors~~ (Proyecto externo)
- [ ] ~~Reviewer Agent: inspect DSL, suggest improvements~~ (Proyecto externo)

**3.2.2: Crear wrapper scripts para agents** ❌ BLOQUEADO
- [ ] ~~Script: `ai-compile.sh`~~ (Proyecto externo lo implementa)
- [ ] ~~Script: `ai-validate.sh`~~ (Proyecto externo lo implementa)
- [ ] ~~Script: `ai-refactor.sh`~~ (Proyecto externo lo implementa)

**3.2.3: Integrar con agnostic-ai-pipeline** ❌ BLOQUEADO
- [ ] ~~Definir prompts~~ (Proyecto externo)
- [ ] ~~Configurar DSPy signatures~~ (Proyecto externo)
- [ ] ~~Configurar MiPRO optimization~~ (Proyecto externo)
- [ ] ~~Test agents con ejemplos~~ (Proyecto externo)

**3.2.4: Crear dataset para training agents** ❌ BLOQUEADO
- [ ] ~~Recolectar flows de ejemplo~~ (Proyecto externo)
- [ ] ~~Anotar con business requirements~~ (Proyecto externo)
- [ ] ~~Anotar con expected outputs~~ (Proyecto externo)
- [ ] ~~Split train/validation/test~~ (Proyecto externo)

**3.2.5: Documentar AI integration** ⚠️ ALTERNATIVA
- [x] ✅ Análisis detallado creado: `docs/TASK_3.2_ANALYSIS.md`
- [ ] ⬜ Crear guía de integración para consumidores externos
- [ ] ⬜ Ejemplos de cómo invocar CLI desde Python/Node/Shell
- [ ] ⬜ Documentar CLI contract para agentes externos

---

### **TASK 3.3: Interactive CLI Mode**
**Estado**: ✅ Completed
**Archivos afectados**: `src/cli/commands/interactive.ts`

#### Subtareas:

**3.3.1: Implementar modo interactivo**
- [x] Prompt para seleccionar input file
- [x] Prompt para opciones de compilación
- [x] Mostrar preview de DSL

**3.3.2: Wizard para crear flows**
- [x] Guided flow creation
- [x] Seleccionar elementos a agregar (Screen/Assignment/Decision opcionales)
- [x] Generar Mermaid automáticamente
- [x] Guardar diagrama y validar

**3.3.3: Live validation feedback**
- [x] Validar on-the-fly tras cada acción
- [x] Mostrar errors/warnings inmediatamente
- [ ] Sugerencias de autocomplete (pendiente)

**3.3.4: Preview de Flow Builder (ASCII art?)**
- [x] Representación visual ASCII en terminal
- [x] Mostrar estructura del flow
- [ ] Highlight puntual de errores (pendiente)

---

### **TASK 3.4: Developer Experience Improvements**
**Estado**: ✅ Completed (core DX features implemented; plugins/color opcional se tratarán aparte)
**Archivos afectados**:
- `src/cli/commands/compile.ts` (212 líneas)
- `src/cli/commands/lint.ts` (213 líneas)
- `src/cli/commands/explain.ts` (280 líneas)
- `src/cli/commands/interactive.ts` (311 líneas)

#### Subtareas:

**3.4.1: Mejorar mensajes de error** ✅ CORE COMPLETO
- [x] Contexto claro en cada error (elementId en logs) - compile.ts:110,117
- [x] Exit codes diferenciados (0=success, 1=validation, 2=errors)
- [x] Contadores de errores/warnings en summary
- [ ] Sugerencias de fix (post-v1, opcional)
- [ ] Links a documentación (post-v1, opcional)
- [ ] Color coding en terminal (post-v1, opcional)

**3.4.2: Agregar debug mode** ✅ COMPLETO
- [x] Flag `--debug` para verbose logging - compile.ts:22, lint.ts:16, explain.ts:49
- [x] Log intermedio de cada stage (timings) - compile.ts:197-211
- [x] Dump de DSL intermedio (.debug/) - compile.ts:173-176
- [x] Performance timings - compile.ts:67,75,81,91,99,105,171

**3.4.3: Crear watch mode** ✅ COMPLETO
- [x] Flag `--watch` para recompilar on change - compile.ts:23-59
- [x] Monitor cambios en archivos/directorios - lint.ts:102-136
- [x] Auto-recompile y validar - ambos comandos soportan watch
- [x] Debouncing implícito (flag `running` evita overlaps)
- [ ] Live reload integration (post-v1, opcional)

**3.4.4: Mejorar performance de compilación** ✅ CORE COMPLETO
- [x] Timings por etapa (debug) - compile.ts:197-211
- [x] Stage markers (read/parse/extract/build/validate/outputs)
- [ ] Profile código para bottlenecks (post-v1, si necesario)
- [ ] Cache/optimizaciones adicionales (post-v1, si necesario)
- [ ] Parallel processing si aplica (post-v1, si necesario)

**3.4.5: Crear CLI plugins system** ⬜ DEFER
- [ ] Arquitectura de plugins (post-v1, requiere checkpoint)
- [ ] Custom validators (post-v1, requiere checkpoint)
- [ ] Custom generators (post-v1, requiere checkpoint)
- [ ] Plugin registry (post-v1, requiere checkpoint)

---

## FASE 4 - EXTENSIONS

### **TASK 4.0: Advanced Element Types**
**Estado**: ✅ Completed (Loop, Wait, GetRecords, Fault soportados)
**Archivos afectados**: `src/types/flow-dsl.ts`, `src/extractor/metadata-extractor.ts`, `src/dsl/intermediate-model-builder.ts`, `src/generators/flow-xml-generator.ts`, `schemas/flow-dsl.schema.json`, tests.

#### Subtareas:

**4.0.1: Implementar Loop element**
- [x] Tipos y schema
- [x] Parser y extractor
- [x] XML generator
- [x] Tests

**4.0.2: Implementar Wait element (avanzado)**
- [x] Wait until condition
- [ ] Wait for time duration (simplificado via condition)
- [ ] Wait for event (simplificado via condition)
- [x] Tests (básico)

**4.0.3: Implementar Fault connectors**
- [x] Fault paths en DSL
- [x] Error handling elements
- [x] XML generation
- [x] Tests

**4.0.4: Implementar Get Records element**
- [x] Query configuration (object/fields/filters)
- [ ] Sorting (pendiente)
- [x] Tests

**4.0.5: Tests de integración con elementos avanzados**
- [x] Flow básico con Loop/Wait/GetRecords/Fault (unit/integration básica)
- [ ] Escenarios complejos y performance tests (pendiente si se requiere)

---

### **TASK 4.1: Automatic Test Case Generation**
**Estado**: ✅ Completed (CI integration diferida)
**Archivos afectados**: `src/test-generator/`

#### Subtareas:

**4.1.1: Analizar DSL para path coverage**
- [ ] Identificar todos los paths posibles
- [ ] Generar test cases por path
- [ ] Identificar edge cases

**4.1.2: Generar test data**
- [ ] Mock data por cada variable
- [ ] Boundary values
- [ ] Invalid data scenarios

**4.1.3: Generar test scripts**
- [ ] Apex test classes
- [ ] Flow test framework integration
- [ ] Assert expected outcomes

**4.1.4: Integración con CI**
- [ ] Auto-generar tests en pipeline (pendiente, no ejecutar ahora)
- [ ] Ejecutar tests en scratch org (pendiente, no ejecutar ahora)
- [ ] Report coverage (pendiente, no ejecutar ahora)

---

### **TASK 4.2: Web-based Visualizer/Editor**
**Estado**: ✅ Completed (visualizer + editor + live XML preview; deploy separado en 4.2.5)
**Archivos afectados**: `web/`, `server/`

#### Subtareas:

**4.2.1: Setup web project**
- [x] Servidor HTTP con `/health` y `/api/compile` conectado al compilador (`dist`)
- [x] Frontend vanilla (HTML/CSS/JS) con layout y estilos iniciales
- [x] Wiring de API → CLI para compilar Mermaid en XML

**4.2.2: Implementar visualizer de DSL**
- [x] Render flow visualmente (lista de nodos/edges en canvas)
- [x] Interactive nodes (selección, edición de metadata básica)
- [ ] Zoom/pan controls (pendiente/optativo)

**4.2.3: Implementar editor gráfico**
- [x] Drag-and-drop elementos y reordenamiento
- [x] Edición de metadata en formularios
- [x] Export a Mermaid/DSL

**4.2.4: Live preview de XML**
- [x] Preview Flow XML en tiempo real (backend /api/compile + frontend)
- [ ] Syntax highlighting (pendiente/optativo)
- [x] Download generated files

**4.2.5: Deploy web app**
- [ ] Hosting (Vercel, Netlify, etc.)
- [ ] Authentication (opcional)
- [ ] Multi-user support

---

### **TASK 4.3: Reverse Engineering - Flow XML to Mermaid**
**Estado**: ✅ Completed (round-trip básico y comando decompile listos)
**Archivos afectados**: `src/reverse/`, `src/cli/commands/decompile.ts`

#### Subtareas:

**4.3.1: Implementar XML parser**
- [x] Parsear `*.flow-meta.xml`
- [x] Extraer elementos (tipos soportados en v1/v4.0)
- [x] Construir DSL desde XML

**4.3.2: Generar Mermaid desde DSL**
- [x] Usar DocsGenerator (reutilizado en comando decompile)
- [ ] Layout optimization (pendiente)
- [ ] Preservar metadata completa (pendiente: components, fields detallados)

**4.3.3: Comando `decompile`**
- [x] CLI command para reverse (`decompile`)
- [x] Input: Flow XML
- [x] Output: Mermaid + DSL

**4.3.4: Tests de round-trip**
- [x] Mermaid → XML → DSL (basic round-trip)
- [x] Mermaid → XML → Mermaid (via DSL + DocsGenerator)
- [ ] Minimal diffs (layout/metadata completa opcional)

---

## TRACKING & METRICS

### Definición de "Done"
Una tarea se considera completa cuando:
- [ ] Código implementado y funcional
- [ ] Tests unitarios escritos y passing
- [ ] Tests de integración passing (si aplica)
- [ ] Documentación actualizada
- [ ] Code review aprobado (si aplica)
- [ ] Merged a main branch
- [ ] Marcado en este documento con ✅

### Métricas de Calidad
- **Test Coverage**: Mínimo 80% en v1, 90% en v2+
- **Build Time**: < 10 segundos para compile de ejemplo simple
- **CLI Response Time**: < 2 segundos para flows < 50 elementos
- **Zero TypeScript Errors**: Build debe ser 100% type-safe

---

## DEPENDENCIAS ENTRE TAREAS

### FASE 1 - PoC
```
1.0 (Setup) → 1.1 (Types) → 1.2 (Parser) → 1.3 (Extractor) → 1.4 (Builder)
                                                              ↓
                                               1.5 (Validator) → 1.6 (XML Gen)
                                                                      ↓
                                                               1.7 (CLI) → 1.8 (Integration Test)
```

### FASE 2 - v1 Usable
```
2.0 (Extend Types) → 2.1 (Extend Extractor) → 2.2 (Extend XML Gen)
                                                ↓
                                         2.3 (Enhanced Validation)
                                                ↓
                  2.4 (DocsGen) → 2.5 (CLI Enhancement) → 2.6 (Examples) → 2.7 (Integration Tests)
                                                                                  ↓
                                                                           2.8 (CI/CD)
```

### FASE 3 - AI/DX
```
2.8 (CI/CD) → 3.0 (Schema) → 3.1 (Explain) → 3.2 (AI Integration)
                   ↓
              3.3 (Interactive) → 3.4 (DX Improvements)
```

---

## ARCHIVOS GENERADOS/AFECTADOS POR FASE

### FASE 1 - PoC
```
package.json
tsconfig.json
jest.config.js
.eslintrc.js
.prettierrc
.gitignore
src/
  cli/
    index.ts
    commands/compile.ts
  parser/
    mermaid-parser.ts
  extractor/
    metadata-extractor.ts
  dsl/
    intermediate-model-builder.ts
  validator/
    flow-validator.ts
  generators/
    flow-xml-generator.ts
  types/
    mermaid.ts
    flow-dsl.ts
    metadata.ts
  utils/
    logger.ts
  __tests__/
    parser.test.ts
    extractor.test.ts
    builder.test.ts
    validator.test.ts
    xml-generator.test.ts
    integration/
      poc.test.ts
examples/
  poc/
    simple-flow.mmd
    simple-flow.flow-meta.xml
```

### FASE 2 - v1 Usable
```
src/
  cli/
    commands/
      lint.ts
  generators/
    docs-generator.ts
  validator/
    semantic-validator.ts
  templates/
    markdown.hbs
  __tests__/
    integration/
      screen-flow.test.ts
      record-create.test.ts
      record-update.test.ts
      subflow.test.ts
      complex-flow.test.ts
examples/
  v1/
    screen-example.mmd
    record-create-example.mmd
    record-update-example.mmd
    subflow-example.mmd
    complex-example.mmd
docs/
  mermaid-conventions.md
  flow-dsl-schema.md
  ci-cd-integration.md
  troubleshooting.md
.github/
  workflows/
    ci.yml
```

### FASE 3 - AI/DX
```
src/
  cli/
    commands/
      explain.ts
    interactive.ts
schemas/
  flow-dsl.schema.json
ai-integration/
  agents/
    analyst.ts
    architect.ts
    implementor.ts
    reviewer.ts
  scripts/
    ai-compile.sh
    ai-validate.sh
docs/
  ai-pipeline.md
```

---

## NOTAS FINALES

### Principios de Desarrollo
1. **TDD First**: Tests antes de implementación
2. **Deterministic**: Mismo input = mismo output
3. **Git-Friendly**: Minimal diffs, stable schema
4. **AI-Friendly**: DSL estructurado y consistente
5. **Simple & Composable**: Módulos pequeños y enfocados

### Comandos Clave por Fase

**FASE 1 - PoC**
```bash
npm run build
npm test
npm run cli -- --input examples/poc/simple-flow.mmd --out-flow ./output
```

**FASE 2 - v1**
```bash
npm run lint
npm run format
npm test -- --coverage
npm run cli -- --input flows/*.mmd --out-flow force-app/main/default/flows --out-json .generated --out-docs docs/flows --strict
```

**FASE 3 - AI/DX**
```bash
npm run cli -- explain flows/MyFlow.mmd
npm run cli -- --watch
npm run interactive
```

---

**FIN DEL PLAN**

Este documento debe actualizarse conforme se completan tareas y se descubren nuevas necesidades.

Marcar con ✅ las tareas completadas y actualizar la sección de archivos afectados con líneas específicas.
