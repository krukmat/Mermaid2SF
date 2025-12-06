# FASE 1 - PoC (Proof of Concept)

**Proyecto**: Mermaid-to-Salesforce Flow Compiler CLI
**Fecha de Creación**: 2025-12-05
**Duración Estimada**: Sprint 1-2
**Objetivo**: Validar viabilidad técnica con elementos básicos

---

## ÍNDICE

1. [Objetivos de la Fase 1](#objetivos-de-la-fase-1)
2. [Scope de la Fase 1](#scope-de-la-fase-1)
3. [Arquitectura del PoC](#arquitectura-del-poc)
4. [Tareas Detalladas](#tareas-detalladas)
5. [Entregables](#entregables)
6. [Criterios de Éxito](#criterios-de-éxito)
7. [Dependencias entre Tareas](#dependencias-entre-tareas)
8. [Comandos de Desarrollo](#comandos-de-desarrollo)
9. [Testing Strategy](#testing-strategy)
10. [Troubleshooting](#troubleshooting)

---

## OBJETIVOS DE LA FASE 1

### Objetivo Principal
Validar la viabilidad técnica del pipeline **Mermaid → Flow DSL → Salesforce Flow XML** con un conjunto mínimo de elementos de Flow.

### Objetivos Específicos

1. **Implementar pipeline completo end-to-end**
   - Parser de Mermaid funcional
   - Modelo intermedio (Flow DSL) en JSON/YAML
   - Generador de Flow XML válido para Salesforce

2. **Validar salida determinista**
   - Mismo input → mismo output (byte-a-byte)
   - Diffs mínimos ante cambios pequeños
   - Ordenamiento consistente de elementos

3. **Probar integración con Salesforce**
   - XML deployable a scratch org
   - Flow se abre correctamente en Flow Builder
   - Flow es ejecutable

4. **Establecer fundamentos para v1**
   - Estructura de proyecto sólida
   - Suite de tests (unit + integration)
   - Documentación básica de convenciones

---

## SCOPE DE LA FASE 1

### Elementos Soportados (PoC)

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| **Start** | Control | Inicio del Flow |
| **End** | Control | Fin del Flow |
| **Assignment** | Logic | Asignación de variables |
| **Decision** | Logic | Decisión condicional con múltiples outcomes |

### Elementos NO Soportados (Fase 2+)

- Screen
- RecordCreate
- RecordUpdate
- Subflow
- Loop
- Wait
- GetRecords
- Fault Paths

### Capacidades del CLI (PoC)

✅ **Incluido**:
- Comando `compile` básico
- Validación estructural
- Generación de Flow XML
- Generación de Flow DSL (JSON/YAML)
- Generación de docs básicas (Mermaid normalizado + markdown)
- Logging básico
- Manejo de errores

❌ **No incluido** (Fase 2+):
- Comando `lint`
- Modo `--strict`
- Validación semántica avanzada
- Integración con `--org-meta`
- Modo watch
- Modo interactivo

---

## ARQUITECTURA DEL PoC

### Pipeline de Compilación

```
┌─────────────────────────────────────────────────────────────────┐
│                        MERMAID INPUT                             │
│                      simple-flow.mmd                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │     MermaidParser.parse()     │
         │   - Extract nodes & edges     │
         │   - Detect shapes & labels    │
         │   - Order deterministically   │
         └───────────────┬───────────────┘
                         │
                         ▼
              ┌─────────────────┐
              │  MermaidGraph   │
              │  - nodes[]      │
              │  - edges[]      │
              │  - direction    │
              └────────┬────────┘
                       │
                       ▼
         ┌────────────────────────────────┐
         │  MetadataExtractor.extract()   │
         │  - Extract type (START, etc.)  │
         │  - Extract api, label          │
         │  - Extract element-specific    │
         │    metadata (assignments, etc.)│
         └────────────┬───────────────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │ ExtractedMetadata[]  │
            │ - type, apiName      │
            │ - properties         │
            └──────────┬───────────┘
                       │
                       ▼
         ┌─────────────────────────────────┐
         │ IntermediateModelBuilder.build()│
         │ - Create FlowDSL structure      │
         │ - Map elements                  │
         │ - Connect via next/outcomes     │
         │ - Order elements & variables    │
         └────────────┬────────────────────┘
                      │
                      ▼
                ┌──────────┐
                │ FlowDSL  │
                │ (JSON)   │
                └────┬─────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │  FlowValidator.validate() │
         │  - Check Start/End exist  │
         │  - Check reachability     │
         │  - Check Decision rules   │
         └────────┬──────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ ValidationResult   │
         │ - errors[]         │
         │ - warnings[]       │
         └────────┬───────────┘
                  │
                  ├─────────────────────────────────┐
                  │                                 │
                  ▼                                 ▼
    ┌──────────────────────────┐      ┌────────────────────────┐
    │ FlowXmlGenerator.generate│      │ DocsGenerator.generate │
    │ - Generate XML elements  │      │ - Normalize Mermaid    │
    │ - Order alphabetically   │      │ - Generate markdown    │
    │ - Format with metadata   │      │                        │
    └──────────┬───────────────┘      └────────┬───────────────┘
               │                               │
               ▼                               ▼
    ┌──────────────────┐            ┌──────────────────────┐
    │  Flow XML Output │            │  Docs Output         │
    │  .flow-meta.xml  │            │  - .normalized.mmd   │
    │                  │            │  - .summary.md       │
    └──────────────────┘            └──────────────────────┘
```

### Módulos y Responsabilidades

| Módulo | Archivo | Responsabilidad |
|--------|---------|-----------------|
| **MermaidParser** | `src/parser/mermaid-parser.ts` | Parsear texto Mermaid a grafo (nodos + edges) |
| **MetadataExtractor** | `src/extractor/metadata-extractor.ts` | Extraer tipo y metadata de cada nodo |
| **IntermediateModelBuilder** | `src/dsl/intermediate-model-builder.ts` | Construir Flow DSL desde grafo + metadata |
| **FlowValidator** | `src/validator/flow-validator.ts` | Validación estructural del DSL |
| **FlowXmlGenerator** | `src/generators/flow-xml-generator.ts` | Generar XML de Salesforce desde DSL |
| **DocsGenerator** | `src/generators/docs-generator.ts` | Generar Mermaid normalizado + markdown |
| **CLI** | `src/cli/index.ts`, `src/cli/commands/compile.ts` | Interface de línea de comandos |

---

## TAREAS DETALLADAS

---

## TASK 1.0: Project Setup & Infrastructure

**Estado**: ⬜ Pending
**Prioridad**: Crítica
**Dependencias**: Ninguna
**Tiempo Estimado**: 2-4 horas

### Descripción
Configurar la infraestructura base del proyecto: Node.js, TypeScript, linting, testing framework, y estructura de carpetas.

### Archivos Afectados
- `package.json`
- `tsconfig.json`
- `jest.config.js`
- `.eslintrc.js`
- `.prettierrc`
- `.gitignore`
- `README.md`

---

### Subtarea 1.0.1: Inicializar proyecto Node.js + TypeScript

**Checklist**:
- [ ] Ejecutar `npm init -y` en el directorio raíz
- [ ] Instalar TypeScript y tipos de Node:
  ```bash
  npm install -D typescript @types/node
  ```
- [ ] Crear `tsconfig.json` con configuración estricta:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "moduleResolution": "node"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.ts"]
  }
  ```
- [ ] Agregar scripts en `package.json`:
  ```json
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  }
  ```

**Criterios de Aceptación**:
- `npm run build` compila sin errores
- Carpeta `dist/` se crea con archivos `.js` y `.d.ts`

---

### Subtarea 1.0.2: Configurar ESLint + Prettier

**Checklist**:
- [ ] Instalar dependencias:
  ```bash
  npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
  npm install -D prettier eslint-config-prettier eslint-plugin-prettier
  ```
- [ ] Crear `.eslintrc.js`:
  ```javascript
  module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'prettier',
    ],
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  };
  ```
- [ ] Crear `.prettierrc`:
  ```json
  {
    "semi": true,
    "trailingComma": "all",
    "singleQuote": true,
    "printWidth": 100,
    "tabWidth": 2,
    "arrowParens": "always"
  }
  ```
- [ ] Agregar scripts:
  ```json
  "scripts": {
    "lint": "eslint 'src/**/*.ts'",
    "lint:fix": "eslint 'src/**/*.ts' --fix",
    "format": "prettier --write 'src/**/*.ts'"
  }
  ```

**Criterios de Aceptación**:
- `npm run lint` ejecuta sin errores
- `npm run format` formatea archivos correctamente

---

### Subtarea 1.0.3: Configurar Jest para testing

**Checklist**:
- [ ] Instalar Jest y tipos:
  ```bash
  npm install -D jest @types/jest ts-jest
  ```
- [ ] Crear `jest.config.js`:
  ```javascript
  module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts',
      '!src/**/__tests__/**',
    ],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  };
  ```
- [ ] Crear carpeta `src/__tests__/`
- [ ] Agregar scripts:
  ```json
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
  ```

**Criterios de Aceptación**:
- `npm test` ejecuta (aunque no haya tests aún)
- Jest está configurado para TypeScript

---

### Subtarea 1.0.4: Configurar estructura de carpetas

**Checklist**:
- [ ] Crear estructura de directorios:
  ```bash
  mkdir -p src/cli/commands
  mkdir -p src/parser
  mkdir -p src/extractor
  mkdir -p src/dsl
  mkdir -p src/validator
  mkdir -p src/generators
  mkdir -p src/types
  mkdir -p src/utils
  mkdir -p src/__tests__/integration
  mkdir -p examples/poc
  mkdir -p docs
  ```
- [ ] Crear archivos `.gitkeep` en carpetas vacías (opcional)

**Criterios de Aceptación**:
- Estructura de carpetas creada y visible en el repo

---

### Subtarea 1.0.5: Configurar Git y .gitignore

**Checklist**:
- [ ] Inicializar Git (si no existe): `git init`
- [ ] Crear `.gitignore`:
  ```
  # Dependencies
  node_modules/

  # Build output
  dist/

  # Test coverage
  coverage/

  # Generated files
  .generated/
  output/

  # Logs
  *.log
  npm-debug.log*

  # OS files
  .DS_Store
  Thumbs.db

  # IDE
  .vscode/
  .idea/
  *.swp
  *.swo

  # Env files
  .env
  .env.local
  ```
- [ ] Crear `README.md` básico:
  ```markdown
  # Mermaid-to-Salesforce Flow Compiler

  CLI tool to compile Mermaid flowcharts into Salesforce Flow metadata.

  ## Setup

  ```bash
  npm install
  npm run build
  ```

  ## Usage

  ```bash
  npm run cli -- --input examples/poc/simple-flow.mmd --out-flow ./output
  ```

  ## Development

  ```bash
  npm run dev       # Watch mode
  npm test          # Run tests
  npm run lint      # Lint code
  ```
  ```

**Criterios de Aceptación**:
- `.gitignore` excluye `node_modules/` y `dist/`
- README.md contiene instrucciones básicas

---

## TASK 1.1: Type Definitions & Core Interfaces

**Estado**: ⬜ Pending
**Prioridad**: Crítica
**Dependencias**: TASK 1.0
**Tiempo Estimado**: 3-4 horas

### Descripción
Definir todos los tipos TypeScript que representan el grafo Mermaid, el Flow DSL, y los metadatos extraídos.

### Archivos Afectados
- `src/types/mermaid.ts`
- `src/types/flow-dsl.ts`
- `src/types/metadata.ts`
- `src/types/index.ts` (barrel export)

---

### Subtarea 1.1.1: Definir tipos para grafo Mermaid

**Checklist**:
- [ ] Crear `src/types/mermaid.ts`
- [ ] Definir interfaces:
  ```typescript
  /**
   * Represents a node in a Mermaid flowchart
   */
  export interface MermaidNode {
    /** Unique identifier for the node */
    id: string;
    /** Full label text (may be multi-line) */
    label: string;
    /** Shape of the node: (), [], {}, etc. */
    shape: NodeShape;
  }

  /**
   * Supported Mermaid node shapes
   */
  export type NodeShape =
    | 'round'      // ([text])
    | 'square'     // [text]
    | 'diamond'    // {text}
    | 'stadium'    // ([text])
    | 'subroutine' // [[text]]
    | 'cylinder'   // [(text)]
    | 'circle';    // ((text))

  /**
   * Represents an edge (connection) between nodes
   */
  export interface MermaidEdge {
    /** Source node ID */
    from: string;
    /** Target node ID */
    to: string;
    /** Optional label on the edge */
    label?: string;
    /** Type of arrow */
    arrowType?: ArrowType;
  }

  export type ArrowType = 'solid' | 'dotted' | 'thick';

  /**
   * Represents the complete Mermaid flowchart graph
   */
  export interface MermaidGraph {
    /** Direction of the flowchart */
    direction: 'TD' | 'LR' | 'TB' | 'RL';
    /** All nodes in the graph (ordered) */
    nodes: MermaidNode[];
    /** All edges in the graph (ordered) */
    edges: MermaidEdge[];
  }
  ```

**Criterios de Aceptación**:
- Tipos compilan sin errores
- JSDoc comments completos
- Exports están disponibles

---

### Subtarea 1.1.2: Definir tipos para Flow DSL (Modelo Intermedio)

**Checklist**:
- [ ] Crear `src/types/flow-dsl.ts`
- [ ] Definir tipos base:
  ```typescript
  /**
   * Supported Flow element types in PoC
   */
  export type ElementType = 'Start' | 'End' | 'Assignment' | 'Decision';

  /**
   * Flow variable definition
   */
  export interface FlowVariable {
    name: string;
    dataType: string;
    isCollection: boolean;
    isInput: boolean;
    isOutput: boolean;
  }

  /**
   * Base interface for all Flow elements
   */
  export interface BaseElement {
    /** Unique ID in the DSL */
    id: string;
    /** Type of element */
    type: ElementType;
    /** Salesforce API name */
    apiName?: string;
    /** Display label */
    label?: string;
    /** Next element ID (for linear flow) */
    next?: string;
  }
  ```

**Criterios de Aceptación**:
- Tipos base definidos
- Comentarios JSDoc presentes

---

### Subtarea 1.1.3: Definir tipos específicos por elemento (PoC: Start, End, Assignment, Decision)

**Checklist**:
- [ ] Agregar a `src/types/flow-dsl.ts`:
  ```typescript
  /**
   * Start element - beginning of the Flow
   */
  export interface StartElement extends BaseElement {
    type: 'Start';
  }

  /**
   * End element - termination of the Flow
   */
  export interface EndElement extends BaseElement {
    type: 'End';
  }

  /**
   * Assignment element - sets variable values
   */
  export interface AssignmentElement extends BaseElement {
    type: 'Assignment';
    /** List of variable assignments */
    assignments: Assignment[];
  }

  export interface Assignment {
    /** Variable name to assign to */
    variable: string;
    /** Value or expression */
    value: string;
  }

  /**
   * Decision element - conditional branching
   */
  export interface DecisionElement extends BaseElement {
    type: 'Decision';
    /** List of possible outcomes */
    outcomes: DecisionOutcome[];
  }

  export interface DecisionOutcome {
    /** Outcome name (e.g., "Yes", "No") */
    name: string;
    /** Condition formula (optional if default) */
    condition?: string;
    /** Whether this is the default outcome */
    isDefault?: boolean;
    /** Next element ID for this outcome */
    next: string;
  }
  ```

**Criterios de Aceptación**:
- Todos los elementos PoC tienen interfaces
- Herencia de `BaseElement` correcta

---

### Subtarea 1.1.4: Definir tipo FlowDSL completo

**Checklist**:
- [ ] Agregar a `src/types/flow-dsl.ts`:
  ```typescript
  /**
   * Union type of all Flow elements
   */
  export type FlowElement =
    | StartElement
    | EndElement
    | AssignmentElement
    | DecisionElement;

  /**
   * Process type for the Flow
   */
  export type ProcessType =
    | 'Autolaunched'
    | 'RecordTriggered'
    | 'Screen';

  /**
   * Complete Flow DSL structure
   */
  export interface FlowDSL {
    /** DSL schema version */
    version: number;
    /** Salesforce Flow API name */
    flowApiName: string;
    /** Display label */
    label: string;
    /** Type of Flow process */
    processType: ProcessType;
    /** Salesforce API version (e.g., 60.0) */
    apiVersion?: string;
    /** ID of the start element */
    startElement: string;
    /** Flow variables (optional) */
    variables?: FlowVariable[];
    /** All Flow elements */
    elements: FlowElement[];
  }

  /**
   * Default API version for Salesforce
   */
  export const DEFAULT_API_VERSION = '60.0';
  ```

**Criterios de Aceptación**:
- `FlowDSL` interface completa
- Constante `DEFAULT_API_VERSION` exportada
- Union type `FlowElement` incluye todos los elementos PoC

---

### Subtarea 1.1.5: Definir tipos para metadatos extraídos

**Checklist**:
- [ ] Crear `src/types/metadata.ts`:
  ```typescript
  import { ElementType } from './flow-dsl';

  /**
   * Metadata extracted from a Mermaid node
   */
  export interface ExtractedMetadata {
    /** Type of Flow element */
    type: ElementType;
    /** Salesforce API name */
    apiName?: string;
    /** Display label */
    label?: string;
    /** Element-specific properties */
    properties: Record<string, any>;
  }
  ```
- [ ] Crear `src/types/index.ts` (barrel export):
  ```typescript
  export * from './mermaid';
  export * from './flow-dsl';
  export * from './metadata';
  ```

**Criterios de Aceptación**:
- `ExtractedMetadata` definido
- Barrel export funcional desde `src/types/`

---

## TASK 1.2: MermaidParser - Parse Mermaid Text

**Estado**: ⬜ Pending
**Prioridad**: Crítica
**Dependencias**: TASK 1.1
**Tiempo Estimado**: 6-8 horas

### Descripción
Implementar el parser que convierte texto Mermaid en una estructura de grafo (nodos + edges) con ordenamiento determinista.

### Archivos Afectados
- `src/parser/mermaid-parser.ts`
- `src/__tests__/parser.test.ts`

---

### Subtarea 1.2.1: Implementar parser básico de texto Mermaid

**Checklist**:
- [ ] Crear `src/parser/mermaid-parser.ts`
- [ ] Implementar clase `MermaidParser`:
  ```typescript
  import { MermaidGraph, MermaidNode, MermaidEdge } from '../types';

  export class MermaidParser {
    /**
     * Parse Mermaid flowchart text into a graph structure
     * @param text - Mermaid flowchart text
     * @returns Parsed graph
     */
    parse(text: string): MermaidGraph {
      const lines = this.preprocessText(text);
      const direction = this.extractDirection(lines);
      const nodes = this.extractNodes(lines);
      const edges = this.extractEdges(lines);

      return {
        direction,
        nodes,
        edges,
      };
    }

    private preprocessText(text: string): string[] {
      // Remove comments, trim lines, filter empty
      return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('%%'));
    }

    private extractDirection(lines: string[]): 'TD' | 'LR' | 'TB' | 'RL' {
      const flowchartLine = lines.find(line => line.startsWith('flowchart'));
      if (!flowchartLine) {
        throw new Error('Missing "flowchart" declaration');
      }
      const match = flowchartLine.match(/flowchart\s+(TD|LR|TB|RL)/);
      return (match?.[1] as any) || 'TD';
    }

    // To be implemented in next subtasks
    private extractNodes(lines: string[]): MermaidNode[] {
      // Implementation in 1.2.2
      return [];
    }

    private extractEdges(lines: string[]): MermaidEdge[] {
      // Implementation in 1.2.3
      return [];
    }
  }
  ```

**Criterios de Aceptación**:
- Clase compila sin errores
- Detecta dirección del flowchart
- Lanza error si falta `flowchart` keyword

---

### Subtarea 1.2.2: Extraer nodos del diagrama

**Checklist**:
- [ ] Implementar `extractNodes()`:
  ```typescript
  private extractNodes(lines: string[]): MermaidNode[] {
    const nodeMap = new Map<string, MermaidNode>();

    for (const line of lines) {
      // Match node definitions: ID[Label], ID([Label]), ID{Label}, etc.
      const nodeRegex = /(\w+)([\[\(\{])([^\]\)\}]+)([\]\)\}])/g;
      let match;

      while ((match = nodeRegex.exec(line)) !== null) {
        const [, id, openBracket, label, closeBracket] = match;
        const shape = this.detectShape(openBracket, closeBracket);

        if (!nodeMap.has(id)) {
          nodeMap.set(id, {
            id,
            label: label.trim(),
            shape,
          });
        }
      }
    }

    // Sort nodes by ID for deterministic output
    return Array.from(nodeMap.values()).sort((a, b) =>
      a.id.localeCompare(b.id)
    );
  }

  private detectShape(open: string, close: string): NodeShape {
    const shapeMap: Record<string, NodeShape> = {
      '[]': 'square',
      '()': 'round',
      '{}': 'diamond',
      '[[]]': 'subroutine',
    };
    return shapeMap[open + close] || 'square';
  }
  ```

**Criterios de Aceptación**:
- Detecta nodos con diferentes shapes
- Labels se extraen correctamente
- **Nodos se ordenan alfabéticamente por ID**

---

### Subtarea 1.2.3: Extraer edges del diagrama

**Checklist**:
- [ ] Implementar `extractEdges()`:
  ```typescript
  private extractEdges(lines: string[]): MermaidEdge[] {
    const edges: MermaidEdge[] = [];

    for (const line of lines) {
      // Match edges: A --> B, A -->|Label| B, etc.
      const edgeRegex = /(\w+)\s*(-->|\.\.>|==>)\s*(?:\|([^|]+)\|)?\s*(\w+)/g;
      let match;

      while ((match = edgeRegex.exec(line)) !== null) {
        const [, from, arrowType, label, to] = match;

        edges.push({
          from,
          to,
          label: label?.trim(),
          arrowType: this.detectArrowType(arrowType),
        });
      }
    }

    // Sort edges for deterministic output (by from, then to)
    return edges.sort((a, b) => {
      if (a.from !== b.from) return a.from.localeCompare(b.from);
      return a.to.localeCompare(b.to);
    });
  }

  private detectArrowType(arrow: string): ArrowType {
    if (arrow === '-->') return 'solid';
    if (arrow === '..>') return 'dotted';
    if (arrow === '==>') return 'thick';
    return 'solid';
  }
  ```

**Criterios de Aceptación**:
- Detecta edges simples y con labels
- **Edges se ordenan por (from, to)** para determinismo
- Soporta diferentes tipos de arrows

---

### Subtarea 1.2.4: Tests unitarios para MermaidParser

**Checklist**:
- [ ] Crear `src/__tests__/parser.test.ts`
- [ ] Tests a implementar:
  ```typescript
  import { MermaidParser } from '../parser/mermaid-parser';

  describe('MermaidParser', () => {
    let parser: MermaidParser;

    beforeEach(() => {
      parser = new MermaidParser();
    });

    test('should throw error on empty diagram', () => {
      expect(() => parser.parse('')).toThrow('Missing "flowchart"');
    });

    test('should parse simple diagram with 2 nodes and 1 edge', () => {
      const input = `
        flowchart TD
        A[Start]
        B[End]
        A --> B
      `;
      const result = parser.parse(input);

      expect(result.direction).toBe('TD');
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0].id).toBe('A');
      expect(result.nodes[1].id).toBe('B');
    });

    test('should parse nodes with different shapes', () => {
      const input = `
        flowchart TD
        A([Round])
        B[Square]
        C{Diamond}
      `;
      const result = parser.parse(input);

      expect(result.nodes[0].shape).toBe('round');
      expect(result.nodes[1].shape).toBe('square');
      expect(result.nodes[2].shape).toBe('diamond');
    });

    test('should parse edges with labels', () => {
      const input = `
        flowchart TD
        A --> B
        B -->|Yes| C
      `;
      const result = parser.parse(input);

      expect(result.edges[0].label).toBeUndefined();
      expect(result.edges[1].label).toBe('Yes');
    });

    test('should order nodes and edges deterministically', () => {
      const input = `
        flowchart TD
        Z --> A
        B --> C
        A[Node A]
        C[Node C]
        Z[Node Z]
        B[Node B]
      `;
      const result1 = parser.parse(input);
      const result2 = parser.parse(input);

      // Same input should produce identical output
      expect(result1).toEqual(result2);

      // Nodes should be alphabetically ordered
      expect(result1.nodes.map(n => n.id)).toEqual(['A', 'B', 'C', 'Z']);

      // Edges should be ordered by (from, to)
      expect(result1.edges[0].from).toBe('B');
      expect(result1.edges[1].from).toBe('Z');
    });
  });
  ```

**Criterios de Aceptación**:
- Todos los tests pasan
- Coverage > 80% en `mermaid-parser.ts`
- **Test de determinismo valida ordenamiento**

---

### Subtarea 1.2.5: Manejo de errores y validaciones

**Checklist**:
- [ ] Agregar validaciones:
  ```typescript
  parse(text: string): MermaidGraph {
    if (!text || text.trim().length === 0) {
      throw new Error('Empty Mermaid diagram');
    }

    const lines = this.preprocessText(text);
    const direction = this.extractDirection(lines);
    const nodes = this.extractNodes(lines);
    const edges = this.extractEdges(lines);

    // Validate edges reference existing nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.from)) {
        throw new Error(`Edge references unknown node: ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        throw new Error(`Edge references unknown node: ${edge.to}`);
      }
    }

    return { direction, nodes, edges };
  }
  ```
- [ ] Agregar tests para errores:
  ```typescript
  test('should throw on edge to unknown node', () => {
    const input = `
      flowchart TD
      A[Start]
      A --> UnknownNode
    `;
    expect(() => parser.parse(input)).toThrow('unknown node');
  });
  ```

**Criterios de Aceptación**:
- Errores claros con mensajes útiles
- Validación de referencias de edges
- Tests de error cases

---

## TASK 1.3: MetadataExtractor - Extract Metadata from Nodes

**Estado**: ⬜ Pending
**Prioridad**: Crítica
**Dependencias**: TASK 1.2
**Tiempo Estimado**: 5-6 horas

### Descripción
Implementar extracción de metadata desde los labels de nodos Mermaid (tipo de elemento, API name, properties específicas).

### Archivos Afectados
- `src/extractor/metadata-extractor.ts`
- `src/__tests__/extractor.test.ts`

---

### Subtarea 1.3.1: Implementar extractor de tipo de elemento

**Checklist**:
- [ ] Crear `src/extractor/metadata-extractor.ts`:
  ```typescript
  import { MermaidNode } from '../types/mermaid';
  import { ElementType, ExtractedMetadata } from '../types';

  export class MetadataExtractor {
    /**
     * Extract metadata from a Mermaid node
     * @param node - Mermaid node
     * @returns Extracted metadata
     */
    extract(node: MermaidNode): ExtractedMetadata {
      const type = this.extractType(node.label);
      const apiName = this.extractApiName(node.label, node.id);
      const label = this.extractLabel(node.label);
      const properties = this.extractProperties(node.label, type);

      return {
        type,
        apiName,
        label,
        properties,
      };
    }

    private extractType(label: string): ElementType {
      const firstLine = label.split('\n')[0].trim().toUpperCase();

      if (firstLine.startsWith('START:')) return 'Start';
      if (firstLine.startsWith('END:')) return 'End';
      if (firstLine.startsWith('ASSIGNMENT:')) return 'Assignment';
      if (firstLine.startsWith('DECISION:')) return 'Decision';

      throw new Error(`Unknown element type in label: ${firstLine}`);
    }

    // To be implemented in next subtasks
    private extractApiName(label: string, nodeId: string): string {
      // Implementation in 1.3.2
      return '';
    }

    private extractLabel(label: string): string {
      // Implementation in 1.3.2
      return '';
    }

    private extractProperties(label: string, type: ElementType): Record<string, any> {
      // Implementation in 1.3.3 and 1.3.4
      return {};
    }
  }
  ```

**Criterios de Aceptación**:
- Detecta los 4 tipos de elemento PoC
- Case-insensitive matching
- Error claro si tipo desconocido

---

### Subtarea 1.3.2: Extraer API name y label

**Checklist**:
- [ ] Implementar extracción:
  ```typescript
  private extractApiName(label: string, nodeId: string): string {
    // Look for "api: SomeName" in the label
    const apiMatch = label.match(/api:\s*(\w+)/i);
    if (apiMatch) {
      return apiMatch[1];
    }

    // Generate from label if not specified
    const displayLabel = this.extractLabel(label);
    return this.generateApiName(displayLabel, nodeId);
  }

  private extractLabel(label: string): string {
    const firstLine = label.split('\n')[0].trim();
    // Remove type prefix (e.g., "START: My Label" -> "My Label")
    const match = firstLine.match(/^(START|END|ASSIGNMENT|DECISION):\s*(.+)$/i);
    return match ? match[2].trim() : firstLine;
  }

  private generateApiName(label: string, fallbackId: string): string {
    // Convert "My Label" -> "My_Label"
    const cleaned = label
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');

    return cleaned || fallbackId;
  }

  private validateApiName(apiName: string): void {
    // Salesforce API name rules: alphanumeric + underscore
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(apiName)) {
      throw new Error(`Invalid API name: ${apiName}`);
    }
  }
  ```

**Criterios de Aceptación**:
- Extrae `api: ` si presente
- Genera API name automático desde label
- Valida formato Salesforce

---

### Subtarea 1.3.3: Extraer metadata específica para Assignment

**Checklist**:
- [ ] Implementar extracción de assignments:
  ```typescript
  private extractProperties(label: string, type: ElementType): Record<string, any> {
    switch (type) {
      case 'Assignment':
        return this.extractAssignmentProperties(label);
      case 'Decision':
        return {}; // Will be implemented in 1.3.4
      default:
        return {};
    }
  }

  private extractAssignmentProperties(label: string): Record<string, any> {
    const assignments: Array<{ variable: string; value: string }> = [];

    // Look for lines like: "set: variableName = expression"
    const lines = label.split('\n');
    for (const line of lines) {
      const match = line.match(/set:\s*(\w+)\s*=\s*(.+)/i);
      if (match) {
        assignments.push({
          variable: match[1].trim(),
          value: match[2].trim(),
        });
      }
    }

    return { assignments };
  }
  ```

**Criterios de Aceptación**:
- Extrae líneas con `set: variable = value`
- Soporta múltiples assignments en un nodo
- Trimming correcto de espacios

---

### Subtarea 1.3.4: Extraer metadata específica para Decision

**Checklist**:
- [ ] Implementar (nota: outcomes se extraen principalmente desde edges, pero podemos parsear condiciones desde label):
  ```typescript
  private extractDecisionProperties(label: string): Record<string, any> {
    // Decisions primarily get their outcomes from edges
    // But we can extract base condition info if needed
    const conditions: string[] = [];

    const lines = label.split('\n');
    for (const line of lines) {
      const match = line.match(/condition:\s*(.+)/i);
      if (match) {
        conditions.push(match[1].trim());
      }
    }

    return { conditions };
  }
  ```
- [ ] Actualizar `extractProperties()`:
  ```typescript
  case 'Decision':
    return this.extractDecisionProperties(label);
  ```

**Criterios de Aceptación**:
- Extrae condiciones opcionales desde label
- **Nota**: outcomes se construirán en IntermediateModelBuilder desde edges

---

### Subtarea 1.3.5: Tests unitarios para MetadataExtractor

**Checklist**:
- [ ] Crear `src/__tests__/extractor.test.ts`:
  ```typescript
  import { MetadataExtractor } from '../extractor/metadata-extractor';
  import { MermaidNode } from '../types';

  describe('MetadataExtractor', () => {
    let extractor: MetadataExtractor;

    beforeEach(() => {
      extractor = new MetadataExtractor();
    });

    test('should extract Start element type', () => {
      const node: MermaidNode = {
        id: 'Start1',
        label: 'START: Flow Start',
        shape: 'round',
      };
      const result = extractor.extract(node);

      expect(result.type).toBe('Start');
      expect(result.label).toBe('Flow Start');
    });

    test('should extract API name from label', () => {
      const node: MermaidNode = {
        id: 'Asg1',
        label: 'ASSIGNMENT: Set Flag\napi: Asg_Set_Flag',
        shape: 'square',
      };
      const result = extractor.extract(node);

      expect(result.apiName).toBe('Asg_Set_Flag');
    });

    test('should generate API name if not specified', () => {
      const node: MermaidNode = {
        id: 'Dec1',
        label: 'DECISION: Check Email',
        shape: 'diamond',
      };
      const result = extractor.extract(node);

      expect(result.apiName).toBe('Check_Email');
    });

    test('should extract assignments from Assignment element', () => {
      const node: MermaidNode = {
        id: 'Asg1',
        label: `ASSIGNMENT: Set Flags
                api: Asg_Set_Flags
                set: v_Flag1 = true
                set: v_Flag2 = false`,
        shape: 'square',
      };
      const result = extractor.extract(node);

      expect(result.properties.assignments).toHaveLength(2);
      expect(result.properties.assignments[0]).toEqual({
        variable: 'v_Flag1',
        value: 'true',
      });
    });

    test('should throw on unknown element type', () => {
      const node: MermaidNode = {
        id: 'Unknown',
        label: 'UNKNOWN: Something',
        shape: 'square',
      };

      expect(() => extractor.extract(node)).toThrow('Unknown element type');
    });
  });
  ```

**Criterios de Aceptación**:
- Tests cubren todos los tipos PoC
- Tests validan API name extraction/generation
- Tests validan assignments extraction

---

## TASK 1.4: IntermediateModelBuilder - Build Flow DSL

**Estado**: ⬜ Pending
**Prioridad**: Crítica
**Dependencias**: TASK 1.3
**Tiempo Estimado**: 6-8 horas

### Descripción
Construir el modelo intermedio (Flow DSL) desde el grafo Mermaid y los metadatos extraídos, asegurando salida determinista.

### Archivos Afectados
- `src/dsl/intermediate-model-builder.ts`
- `src/__tests__/builder.test.ts`

---

### Subtarea 1.4.1: Implementar builder de DSL

**Checklist**:
- [ ] Crear `src/dsl/intermediate-model-builder.ts`:
  ```typescript
  import { MermaidGraph } from '../types/mermaid';
  import { FlowDSL, FlowElement, DEFAULT_API_VERSION } from '../types/flow-dsl';
  import { ExtractedMetadata } from '../types/metadata';

  export class IntermediateModelBuilder {
    /**
     * Build Flow DSL from Mermaid graph and extracted metadata
     * @param graph - Parsed Mermaid graph
     * @param metadataMap - Map of node ID to extracted metadata
     * @param flowApiName - API name for the Flow
     * @param flowLabel - Display label for the Flow
     * @returns Flow DSL
     */
    build(
      graph: MermaidGraph,
      metadataMap: Map<string, ExtractedMetadata>,
      flowApiName: string,
      flowLabel: string,
    ): FlowDSL {
      const elements = this.buildElements(graph, metadataMap);
      const startElement = this.findStartElement(elements);
      const variables = this.inferVariables(elements);

      return {
        version: 1,
        flowApiName,
        label: flowLabel,
        processType: 'Autolaunched',
        apiVersion: DEFAULT_API_VERSION,
        startElement,
        variables: variables.length > 0 ? variables : undefined,
        elements,
      };
    }

    private buildElements(
      graph: MermaidGraph,
      metadataMap: Map<string, ExtractedMetadata>,
    ): FlowElement[] {
      // Implementation in 1.4.2
      return [];
    }

    private findStartElement(elements: FlowElement[]): string {
      const startElement = elements.find(el => el.type === 'Start');
      if (!startElement) {
        throw new Error('No Start element found in Flow');
      }
      return startElement.id;
    }

    private inferVariables(elements: FlowElement[]): FlowVariable[] {
      // Implementation in 1.4.4
      return [];
    }
  }
  ```

**Criterios de Aceptación**:
- Builder crea estructura DSL básica
- Detecta startElement correctamente
- Lanza error si no hay Start

---

### Subtarea 1.4.2: Convertir nodos a elementos DSL

**Checklist**:
- [ ] Implementar `buildElements()`:
  ```typescript
  private buildElements(
    graph: MermaidGraph,
    metadataMap: Map<string, ExtractedMetadata>,
  ): FlowElement[] {
    const elements: FlowElement[] = [];
    const edgeMap = this.buildEdgeMap(graph.edges);

    for (const node of graph.nodes) {
      const metadata = metadataMap.get(node.id);
      if (!metadata) {
        throw new Error(`No metadata found for node: ${node.id}`);
      }

      const element = this.createElementFromMetadata(
        node.id,
        metadata,
        edgeMap,
      );
      elements.push(element);
    }

    // Sort elements by ID for deterministic output
    return elements.sort((a, b) => a.id.localeCompare(b.id));
  }

  private buildEdgeMap(edges: MermaidEdge[]): Map<string, MermaidEdge[]> {
    const map = new Map<string, MermaidEdge[]>();
    for (const edge of edges) {
      if (!map.has(edge.from)) {
        map.set(edge.from, []);
      }
      map.get(edge.from)!.push(edge);
    }
    return map;
  }

  private createElementFromMetadata(
    nodeId: string,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): FlowElement {
    const base = {
      id: nodeId,
      type: metadata.type,
      apiName: metadata.apiName,
      label: metadata.label,
    };

    switch (metadata.type) {
      case 'Start':
        return this.createStartElement(base, edgeMap);
      case 'End':
        return this.createEndElement(base);
      case 'Assignment':
        return this.createAssignmentElement(base, metadata, edgeMap);
      case 'Decision':
        return this.createDecisionElement(base, metadata, edgeMap);
      default:
        throw new Error(`Unsupported element type: ${metadata.type}`);
    }
  }

  private createStartElement(
    base: any,
    edgeMap: Map<string, MermaidEdge[]>,
  ): StartElement {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'Start',
      next: edges[0]?.to,
    };
  }

  private createEndElement(base: any): EndElement {
    return {
      ...base,
      type: 'End',
    };
  }

  private createAssignmentElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): AssignmentElement {
    const edges = edgeMap.get(base.id) || [];
    return {
      ...base,
      type: 'Assignment',
      assignments: metadata.properties.assignments || [],
      next: edges[0]?.to,
    };
  }

  private createDecisionElement(
    base: any,
    metadata: ExtractedMetadata,
    edgeMap: Map<string, MermaidEdge[]>,
  ): DecisionElement {
    const edges = edgeMap.get(base.id) || [];
    const outcomes = this.buildOutcomes(edges);

    return {
      ...base,
      type: 'Decision',
      outcomes,
    };
  }
  ```

**Criterios de Aceptación**:
- Crea elementos correctos según metadata.type
- **Elementos ordenados alfabéticamente por ID**
- EdgeMap correcto para conectividad

---

### Subtarea 1.4.3: Conectar elementos según edges

**Checklist**:
- [ ] Implementar `buildOutcomes()` para Decisions:
  ```typescript
  private buildOutcomes(edges: MermaidEdge[]): DecisionOutcome[] {
    const outcomes: DecisionOutcome[] = [];

    for (const edge of edges) {
      const isDefault = edge.label?.toLowerCase().includes('default') || false;

      outcomes.push({
        name: edge.label || 'Outcome',
        condition: isDefault ? undefined : edge.label,
        isDefault,
        next: edge.to,
      });
    }

    // Sort outcomes: non-default alphabetically, default last
    return outcomes.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return 1;
      if (!a.isDefault && b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });
  }
  ```

**Criterios de Aceptación**:
- Outcomes creados desde edges
- Default outcome detectado
- **Outcomes ordenados (default al final)**

---

### Subtarea 1.4.4: Inferir variables automáticamente (opcional PoC)

**Checklist**:
- [ ] Implementar `inferVariables()`:
  ```typescript
  import { FlowVariable } from '../types/flow-dsl';

  private inferVariables(elements: FlowElement[]): FlowVariable[] {
    const variableSet = new Set<string>();

    // Collect variables from Assignments
    for (const element of elements) {
      if (element.type === 'Assignment') {
        for (const assignment of element.assignments) {
          variableSet.add(assignment.variable);
        }
      }
    }

    // Convert to FlowVariable array
    const variables: FlowVariable[] = Array.from(variableSet).map(name => ({
      name,
      dataType: this.inferDataType(name),
      isCollection: false,
      isInput: false,
      isOutput: false,
    }));

    // Sort variables alphabetically for determinism
    return variables.sort((a, b) => a.name.localeCompare(b.name));
  }

  private inferDataType(variableName: string): string {
    // Simple heuristic: v_Flag -> Boolean, v_Count -> Number, etc.
    if (variableName.toLowerCase().includes('flag')) return 'Boolean';
    if (variableName.toLowerCase().includes('count')) return 'Number';
    return 'String';
  }
  ```

**Criterios de Aceptación**:
- Variables inferidas desde assignments
- **Variables ordenadas alfabéticamente**
- DataType inference básico

---

### Subtarea 1.4.5: Tests unitarios para IntermediateModelBuilder

**Checklist**:
- [ ] Crear `src/__tests__/builder.test.ts`:
  ```typescript
  import { IntermediateModelBuilder } from '../dsl/intermediate-model-builder';
  import { MermaidGraph, MermaidNode, MermaidEdge } from '../types/mermaid';
  import { ExtractedMetadata } from '../types/metadata';

  describe('IntermediateModelBuilder', () => {
    let builder: IntermediateModelBuilder;

    beforeEach(() => {
      builder = new IntermediateModelBuilder();
    });

    test('should build DSL with Start -> End', () => {
      const graph: MermaidGraph = {
        direction: 'TD',
        nodes: [
          { id: 'Start', label: 'START: Begin', shape: 'round' },
          { id: 'End', label: 'END: Finish', shape: 'round' },
        ],
        edges: [{ from: 'Start', to: 'End' }],
      };

      const metadataMap = new Map<string, ExtractedMetadata>([
        ['Start', { type: 'Start', apiName: 'Start', label: 'Begin', properties: {} }],
        ['End', { type: 'End', apiName: 'End', label: 'Finish', properties: {} }],
      ]);

      const result = builder.build(graph, metadataMap, 'TestFlow', 'Test Flow');

      expect(result.flowApiName).toBe('TestFlow');
      expect(result.startElement).toBe('Start');
      expect(result.elements).toHaveLength(2);
      expect(result.elements[0].type).toBe('End'); // Sorted alphabetically
      expect(result.elements[1].type).toBe('Start');
    });

    test('should build DSL with Assignment', () => {
      const graph: MermaidGraph = {
        direction: 'TD',
        nodes: [
          { id: 'Start', label: 'START', shape: 'round' },
          { id: 'Assign', label: 'ASSIGNMENT', shape: 'square' },
          { id: 'End', label: 'END', shape: 'round' },
        ],
        edges: [
          { from: 'Start', to: 'Assign' },
          { from: 'Assign', to: 'End' },
        ],
      };

      const metadataMap = new Map<string, ExtractedMetadata>([
        ['Start', { type: 'Start', properties: {} }],
        ['Assign', {
          type: 'Assignment',
          properties: {
            assignments: [{ variable: 'v_Flag', value: 'true' }],
          },
        }],
        ['End', { type: 'End', properties: {} }],
      ]);

      const result = builder.build(graph, metadataMap, 'TestFlow', 'Test');

      const assignElement = result.elements.find(e => e.type === 'Assignment');
      expect(assignElement).toBeDefined();
      expect((assignElement as any).assignments).toHaveLength(1);
      expect((assignElement as any).next).toBe('End');
    });

    test('should build Decision with outcomes', () => {
      const graph: MermaidGraph = {
        direction: 'TD',
        nodes: [
          { id: 'Dec', label: 'DECISION', shape: 'diamond' },
          { id: 'End1', label: 'END', shape: 'round' },
          { id: 'End2', label: 'END', shape: 'round' },
        ],
        edges: [
          { from: 'Dec', to: 'End1', label: 'Yes' },
          { from: 'Dec', to: 'End2', label: 'No (default)' },
        ],
      };

      const metadataMap = new Map<string, ExtractedMetadata>([
        ['Dec', { type: 'Decision', properties: {} }],
        ['End1', { type: 'End', properties: {} }],
        ['End2', { type: 'End', properties: {} }],
      ]);

      const result = builder.build(graph, metadataMap, 'TestFlow', 'Test');

      const decElement = result.elements.find(e => e.type === 'Decision');
      expect(decElement).toBeDefined();
      expect((decElement as any).outcomes).toHaveLength(2);

      // Default should be last
      const outcomes = (decElement as any).outcomes;
      expect(outcomes[1].isDefault).toBe(true);
    });

    test('should infer variables from assignments', () => {
      const graph: MermaidGraph = {
        direction: 'TD',
        nodes: [
          { id: 'Start', label: 'START', shape: 'round' },
          { id: 'Assign', label: 'ASSIGNMENT', shape: 'square' },
        ],
        edges: [{ from: 'Start', to: 'Assign' }],
      };

      const metadataMap = new Map<string, ExtractedMetadata>([
        ['Start', { type: 'Start', properties: {} }],
        ['Assign', {
          type: 'Assignment',
          properties: {
            assignments: [
              { variable: 'v_Flag', value: 'true' },
              { variable: 'v_Count', value: '0' },
            ],
          },
        }],
      ]);

      const result = builder.build(graph, metadataMap, 'TestFlow', 'Test');

      expect(result.variables).toBeDefined();
      expect(result.variables).toHaveLength(2);
      expect(result.variables![0].name).toBe('v_Count'); // Alphabetically first
      expect(result.variables![1].name).toBe('v_Flag');
    });

    test('should produce deterministic output', () => {
      const graph: MermaidGraph = {
        direction: 'TD',
        nodes: [
          { id: 'Z', label: 'START', shape: 'round' },
          { id: 'A', label: 'END', shape: 'round' },
        ],
        edges: [{ from: 'Z', to: 'A' }],
      };

      const metadataMap = new Map<string, ExtractedMetadata>([
        ['Z', { type: 'Start', properties: {} }],
        ['A', { type: 'End', properties: {} }],
      ]);

      const result1 = builder.build(graph, metadataMap, 'Flow', 'Test');
      const result2 = builder.build(graph, metadataMap, 'Flow', 'Test');

      // Same input -> exact same output
      expect(result1).toEqual(result2);

      // Elements ordered alphabetically
      expect(result1.elements[0].id).toBe('A');
      expect(result1.elements[1].id).toBe('Z');
    });
  });
  ```

**Criterios de Aceptación**:
- Tests cubren todos los elementos PoC
- **Test de determinismo verifica ordenamiento**
- Test valida inferencia de variables

---

## TASK 1.5: Validator - Basic Structural Validation

**Estado**: ⬜ Pending
**Prioridad**: Alta
**Dependencias**: TASK 1.4
**Tiempo Estimado**: 4-5 horas

### Descripción
Implementar validador estructural para el Flow DSL: verificar existencia de Start/End, alcanzabilidad, y reglas de Decision.

### Archivos Afectados
- `src/validator/flow-validator.ts`
- `src/types/validation.ts`
- `src/__tests__/validator.test.ts`

---

### Subtarea 1.5.1: Implementar validador estructural

**Checklist**:
- [ ] Crear `src/types/validation.ts`:
  ```typescript
  export interface ValidationError {
    code: string;
    message: string;
    elementId?: string;
  }

  export interface ValidationWarning {
    code: string;
    message: string;
    elementId?: string;
  }

  export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }
  ```
- [ ] Crear `src/validator/flow-validator.ts`:
  ```typescript
  import { FlowDSL } from '../types/flow-dsl';
  import { ValidationResult, ValidationError, ValidationWarning } from '../types/validation';

  export class FlowValidator {
    /**
     * Validate Flow DSL structure
     * @param dsl - Flow DSL to validate
     * @returns Validation result
     */
    validate(dsl: FlowDSL): ValidationResult {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      this.validateStartEnd(dsl, errors);
      this.validateReachability(dsl, warnings);
      this.validateDecisions(dsl, errors);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }

    private validateStartEnd(dsl: FlowDSL, errors: ValidationError[]): void {
      // Implementation in 1.5.2
    }

    private validateReachability(dsl: FlowDSL, warnings: ValidationWarning[]): void {
      // Implementation in 1.5.3
    }

    private validateDecisions(dsl: FlowDSL, errors: ValidationError[]): void {
      // Implementation in 1.5.4
    }
  }
  ```

**Criterios de Aceptación**:
- `ValidationResult` type definido
- Estructura de validator creada

---

### Subtarea 1.5.2: Validar existencia de Start y End

**Checklist**:
- [ ] Implementar `validateStartEnd()`:
  ```typescript
  private validateStartEnd(dsl: FlowDSL, errors: ValidationError[]): void {
    const startElements = dsl.elements.filter(e => e.type === 'Start');
    const endElements = dsl.elements.filter(e => e.type === 'End');

    if (startElements.length === 0) {
      errors.push({
        code: 'MISSING_START',
        message: 'Flow must have at least one Start element',
      });
    }

    if (startElements.length > 1) {
      errors.push({
        code: 'MULTIPLE_START',
        message: `Flow must have exactly one Start element, found ${startElements.length}`,
      });
    }

    if (endElements.length === 0) {
      errors.push({
        code: 'MISSING_END',
        message: 'Flow must have at least one End element',
      });
    }

    // Validate startElement points to existing element
    if (!dsl.elements.find(e => e.id === dsl.startElement)) {
      errors.push({
        code: 'INVALID_START_REFERENCE',
        message: `startElement "${dsl.startElement}" does not exist`,
      });
    }
  }
  ```

**Criterios de Aceptación**:
- Error si no hay Start
- Error si hay múltiples Start
- Error si no hay End
- Error si startElement inválido

---

### Subtarea 1.5.3: Validar conectividad y alcanzabilidad

**Checklist**:
- [ ] Implementar `validateReachability()`:
  ```typescript
  private validateReachability(dsl: FlowDSL, warnings: ValidationWarning[]): void {
    const reachable = new Set<string>();
    const queue: string[] = [dsl.startElement];

    // BFS to find all reachable elements
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (reachable.has(currentId)) continue;

      reachable.add(currentId);
      const element = dsl.elements.find(e => e.id === currentId);
      if (!element) continue;

      // Add next elements to queue
      if ('next' in element && element.next) {
        queue.push(element.next);
      }

      if (element.type === 'Decision') {
        for (const outcome of element.outcomes) {
          queue.push(outcome.next);
        }
      }
    }

    // Find unreachable elements
    for (const element of dsl.elements) {
      if (!reachable.has(element.id)) {
        warnings.push({
          code: 'UNREACHABLE_ELEMENT',
          message: `Element "${element.id}" is not reachable from Start`,
          elementId: element.id,
        });
      }
    }
  }
  ```

**Criterios de Aceptación**:
- BFS correcto desde Start
- Warning por cada elemento inalcanzable

---

### Subtarea 1.5.4: Validar Decision elements

**Checklist**:
- [ ] Implementar `validateDecisions()`:
  ```typescript
  private validateDecisions(dsl: FlowDSL, errors: ValidationError[]): void {
    const decisions = dsl.elements.filter(e => e.type === 'Decision');

    for (const decision of decisions) {
      const decisionElement = decision as DecisionElement;

      // Must have at least one outcome
      if (decisionElement.outcomes.length === 0) {
        errors.push({
          code: 'DECISION_NO_OUTCOMES',
          message: `Decision "${decision.id}" must have at least one outcome`,
          elementId: decision.id,
        });
      }

      // Must have exactly one default outcome
      const defaultOutcomes = decisionElement.outcomes.filter(o => o.isDefault);
      if (defaultOutcomes.length === 0) {
        errors.push({
          code: 'DECISION_NO_DEFAULT',
          message: `Decision "${decision.id}" must have exactly one default outcome`,
          elementId: decision.id,
        });
      }

      if (defaultOutcomes.length > 1) {
        errors.push({
          code: 'DECISION_MULTIPLE_DEFAULTS',
          message: `Decision "${decision.id}" has ${defaultOutcomes.length} default outcomes, expected 1`,
          elementId: decision.id,
        });
      }

      // Validate all outcomes have next
      for (const outcome of decisionElement.outcomes) {
        if (!outcome.next) {
          errors.push({
            code: 'OUTCOME_NO_NEXT',
            message: `Outcome "${outcome.name}" in Decision "${decision.id}" must have a next element`,
            elementId: decision.id,
          });
        }
      }
    }
  }
  ```

**Criterios de Aceptación**:
- Error si Decision sin outcomes
- Error si no hay default outcome
- Error si múltiples defaults
- Error si outcome sin next

---

### Subtarea 1.5.5: Tests unitarios para Validator

**Checklist**:
- [ ] Crear `src/__tests__/validator.test.ts`:
  ```typescript
  import { FlowValidator } from '../validator/flow-validator';
  import { FlowDSL } from '../types/flow-dsl';

  describe('FlowValidator', () => {
    let validator: FlowValidator;

    beforeEach(() => {
      validator = new FlowValidator();
    });

    test('should validate valid simple flow', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'End' },
          { id: 'End', type: 'End' },
        ],
      };

      const result = validator.validate(dsl);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should error on missing Start', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'End', type: 'End' },
        ],
      };

      const result = validator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'MISSING_START' })
      );
    });

    test('should error on missing End', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start' },
        ],
      };

      const result = validator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'MISSING_END' })
      );
    });

    test('should warn on unreachable elements', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'End' },
          { id: 'End', type: 'End' },
          { id: 'Orphan', type: 'End' }, // Unreachable
        ],
      };

      const result = validator.validate(dsl);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'UNREACHABLE_ELEMENT',
          elementId: 'Orphan',
        })
      );
    });

    test('should error on Decision without default', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'Dec' },
          {
            id: 'Dec',
            type: 'Decision',
            outcomes: [
              { name: 'Yes', next: 'End', isDefault: false },
            ],
          },
          { id: 'End', type: 'End' },
        ],
      };

      const result = validator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'DECISION_NO_DEFAULT' })
      );
    });

    test('should error on Decision with multiple defaults', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'Dec' },
          {
            id: 'Dec',
            type: 'Decision',
            outcomes: [
              { name: 'Yes', next: 'End', isDefault: true },
              { name: 'No', next: 'End', isDefault: true },
            ],
          },
          { id: 'End', type: 'End' },
        ],
      };

      const result = validator.validate(dsl);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'DECISION_MULTIPLE_DEFAULTS' })
      );
    });
  });
  ```

**Criterios de Aceptación**:
- Tests cubren todos los casos de error
- Tests cubren warnings
- All tests pass

---

## TASK 1.6: FlowXmlGenerator - Generate Salesforce Flow XML (Minimal)

**Estado**: ⬜ Pending
**Prioridad**: Crítica
**Dependencias**: TASK 1.5
**Tiempo Estimado**: 8-10 horas

### Descripción
Generar XML de Salesforce Flow válido desde el Flow DSL, con ordenamiento determinista para diffs mínimos.

### Archivos Afectados
- `src/generators/flow-xml-generator.ts`
- `src/__tests__/xml-generator.test.ts`
- `examples/poc/simple-flow.flow-meta.xml` (golden file)

---

### Subtarea 1.6.1: Implementar generador XML base

**Checklist**:
- [ ] Crear `src/generators/flow-xml-generator.ts`:
  ```typescript
  import { FlowDSL, FlowElement } from '../types/flow-dsl';

  export class FlowXmlGenerator {
    /**
     * Generate Salesforce Flow XML from DSL
     * @param dsl - Flow DSL
     * @returns XML string
     */
    generate(dsl: FlowDSL): string {
      const lines: string[] = [];

      // XML header
      lines.push('<?xml version="1.0" encoding="UTF-8"?>');
      lines.push('<Flow xmlns="http://soap.sforce.com/2006/04/metadata">');

      // Metadata
      lines.push(`    <apiVersion>${dsl.apiVersion || '60.0'}</apiVersion>`);
      lines.push(`    <label>${this.escapeXml(dsl.label)}</label>`);
      lines.push(`    <processType>${dsl.processType}</processType>`);

      // Sort elements alphabetically by API name for deterministic output
      const sortedElements = [...dsl.elements].sort((a, b) => {
        const aName = a.apiName || a.id;
        const bName = b.apiName || b.id;
        return aName.localeCompare(bName);
      });

      // Generate elements
      for (const element of sortedElements) {
        const elementXml = this.generateElement(element);
        lines.push(...elementXml);
      }

      // Start element reference
      lines.push(`    <start>`);
      lines.push(`        <locationX>0</locationX>`);
      lines.push(`        <locationY>0</locationY>`);
      const startElement = dsl.elements.find(e => e.id === dsl.startElement);
      if (startElement && 'next' in startElement && startElement.next) {
        lines.push(`        <connector>`);
        lines.push(`            <targetReference>${startElement.next}</targetReference>`);
        lines.push(`        </connector>`);
      }
      lines.push(`    </start>`);

      lines.push('</Flow>');

      return lines.join('\n');
    }

    private escapeXml(text: string): string {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    private generateElement(element: FlowElement): string[] {
      switch (element.type) {
        case 'Start':
          return []; // Start is handled separately
        case 'End':
          return []; // End doesn't need XML in Flow
        case 'Assignment':
          return this.generateAssignment(element);
        case 'Decision':
          return this.generateDecision(element);
        default:
          return [];
      }
    }

    // To be implemented in next subtasks
    private generateAssignment(element: any): string[] {
      return [];
    }

    private generateDecision(element: any): string[] {
      return [];
    }
  }
  ```

**Criterios de Aceptación**:
- XML header correcto
- Metadata (apiVersion, label, processType)
- **Elementos ordenados alfabéticamente** por API name
- Start element reference

---

### Subtarea 1.6.2: Generar XML para Start element

**Checklist**:
- [ ] Start se maneja en el bloque `<start>` del XML base
- [ ] Verificar que connector se genera correctamente

**Criterios de Aceptación**:
- `<start>` block tiene connector a siguiente elemento

---

### Subtarea 1.6.3: Generar XML para Assignment element

**Checklist**:
- [ ] Implementar `generateAssignment()`:
  ```typescript
  private generateAssignment(element: AssignmentElement): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <assignments>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    // Sort assignments alphabetically by variable name
    const sortedAssignments = [...element.assignments].sort((a, b) =>
      a.variable.localeCompare(b.variable)
    );

    for (const assignment of sortedAssignments) {
      lines.push(`        <assignmentItems>`);
      lines.push(`            <assignToReference>${assignment.variable}</assignToReference>`);
      lines.push(`            <operator>Assign</operator>`);
      lines.push(`            <value>`);
      lines.push(`                <stringValue>${this.escapeXml(assignment.value)}</stringValue>`);
      lines.push(`            </value>`);
      lines.push(`        </assignmentItems>`);
    }

    if (element.next) {
      lines.push(`        <connector>`);
      lines.push(`            <targetReference>${element.next}</targetReference>`);
      lines.push(`        </connector>`);
    }

    lines.push(`    </assignments>`);

    return lines;
  }
  ```

**Criterios de Aceptación**:
- XML válido para Assignment
- **Assignments ordenados alfabéticamente**
- Connector a next element

---

### Subtarea 1.6.4: Generar XML para Decision element

**Checklist**:
- [ ] Implementar `generateDecision()`:
  ```typescript
  private generateDecision(element: DecisionElement): string[] {
    const lines: string[] = [];
    const apiName = element.apiName || element.id;

    lines.push(`    <decisions>`);
    lines.push(`        <name>${apiName}</name>`);
    lines.push(`        <label>${this.escapeXml(element.label || apiName)}</label>`);
    lines.push(`        <locationX>0</locationX>`);
    lines.push(`        <locationY>0</locationY>`);

    // Sort outcomes: non-default alphabetically, default last
    const sortedOutcomes = [...element.outcomes].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return 1;
      if (!a.isDefault && b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });

    for (const outcome of sortedOutcomes) {
      if (outcome.isDefault) {
        lines.push(`        <defaultConnector>`);
        lines.push(`            <targetReference>${outcome.next}</targetReference>`);
        lines.push(`        </defaultConnector>`);
        lines.push(`        <defaultConnectorLabel>${this.escapeXml(outcome.name)}</defaultConnectorLabel>`);
      } else {
        lines.push(`        <rules>`);
        lines.push(`            <name>${this.escapeXml(outcome.name)}</name>`);
        lines.push(`            <conditionLogic>and</conditionLogic>`);
        lines.push(`            <conditions>`);
        lines.push(`                <leftValueReference>${outcome.condition || 'true'}</leftValueReference>`);
        lines.push(`                <operator>EqualTo</operator>`);
        lines.push(`                <rightValue>`);
        lines.push(`                    <booleanValue>true</booleanValue>`);
        lines.push(`                </rightValue>`);
        lines.push(`            </conditions>`);
        lines.push(`            <connector>`);
        lines.push(`                <targetReference>${outcome.next}</targetReference>`);
        lines.push(`            </connector>`);
        lines.push(`            <label>${this.escapeXml(outcome.name)}</label>`);
        lines.push(`        </rules>`);
      }
    }

    lines.push(`    </decisions>`);

    return lines;
  }
  ```

**Criterios de Aceptación**:
- XML válido para Decision
- **Outcomes ordenados (default al final)**
- Default connector correcto
- Rules con conditions

---

### Subtarea 1.6.5: Tests unitarios para FlowXmlGenerator

**Checklist**:
- [ ] Crear `src/__tests__/xml-generator.test.ts`:
  ```typescript
  import { FlowXmlGenerator } from '../generators/flow-xml-generator';
  import { FlowDSL } from '../types/flow-dsl';

  describe('FlowXmlGenerator', () => {
    let generator: FlowXmlGenerator;

    beforeEach(() => {
      generator = new FlowXmlGenerator();
    });

    test('should generate valid XML for simple flow', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'SimpleFlow',
        label: 'Simple Flow',
        processType: 'Autolaunched',
        apiVersion: '60.0',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'End' },
          { id: 'End', type: 'End' },
        ],
      };

      const xml = generator.generate(dsl);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<Flow xmlns=');
      expect(xml).toContain('<apiVersion>60.0</apiVersion>');
      expect(xml).toContain('<label>Simple Flow</label>');
      expect(xml).toContain('<processType>Autolaunched</processType>');
    });

    test('should generate Assignment XML', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'Asg' },
          {
            id: 'Asg',
            type: 'Assignment',
            apiName: 'Asg_Set_Flag',
            assignments: [
              { variable: 'v_Flag', value: 'true' },
            ],
            next: 'End',
          },
          { id: 'End', type: 'End' },
        ],
      };

      const xml = generator.generate(dsl);

      expect(xml).toContain('<assignments>');
      expect(xml).toContain('<name>Asg_Set_Flag</name>');
      expect(xml).toContain('<assignToReference>v_Flag</assignToReference>');
      expect(xml).toContain('<stringValue>true</stringValue>');
    });

    test('should generate Decision XML', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'Dec' },
          {
            id: 'Dec',
            type: 'Decision',
            apiName: 'Dec_Check',
            outcomes: [
              { name: 'Yes', condition: 'v_Flag', next: 'End1', isDefault: false },
              { name: 'No', next: 'End2', isDefault: true },
            ],
          },
          { id: 'End1', type: 'End' },
          { id: 'End2', type: 'End' },
        ],
      };

      const xml = generator.generate(dsl);

      expect(xml).toContain('<decisions>');
      expect(xml).toContain('<name>Dec_Check</name>');
      expect(xml).toContain('<rules>');
      expect(xml).toContain('<defaultConnector>');
    });

    test('should order elements alphabetically', () => {
      const dsl: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'Z_Assignment' },
          {
            id: 'Z_Assignment',
            type: 'Assignment',
            apiName: 'Z_Assignment',
            assignments: [],
            next: 'A_Assignment',
          },
          {
            id: 'A_Assignment',
            type: 'Assignment',
            apiName: 'A_Assignment',
            assignments: [],
          },
        ],
      };

      const xml = generator.generate(dsl);

      // Find positions of elements in XML
      const posA = xml.indexOf('<name>A_Assignment</name>');
      const posZ = xml.indexOf('<name>Z_Assignment</name>');

      // A should come before Z (alphabetically ordered)
      expect(posA).toBeLessThan(posZ);
    });

    test('should produce minimal diffs for small changes', () => {
      const dsl1: FlowDSL = {
        version: 1,
        flowApiName: 'TestFlow',
        label: 'Test',
        processType: 'Autolaunched',
        startElement: 'Start',
        elements: [
          { id: 'Start', type: 'Start', next: 'End' },
          { id: 'End', type: 'End' },
        ],
      };

      const dsl2: FlowDSL = {
        ...dsl1,
        elements: [
          ...dsl1.elements,
          {
            id: 'NewNode',
            type: 'Assignment',
            apiName: 'New_Node',
            assignments: [],
          },
        ],
      };

      const xml1 = generator.generate(dsl1);
      const xml2 = generator.generate(dsl2);

      // Count lines changed
      const lines1 = xml1.split('\n');
      const lines2 = xml2.split('\n');

      let diffCount = 0;
      const maxLen = Math.max(lines1.length, lines2.length);
      for (let i = 0; i < maxLen; i++) {
        if (lines1[i] !== lines2[i]) diffCount++;
      }

      // Adding one node should change < 20 lines (arbitrary threshold)
      expect(diffCount).toBeLessThan(20);
    });
  });
  ```
- [ ] Crear golden file `examples/poc/simple-flow.flow-meta.xml`:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <Flow xmlns="http://soap.sforce.com/2006/04/metadata">
      <apiVersion>60.0</apiVersion>
      <label>Simple Flow</label>
      <processType>Autolaunched</processType>
      <assignments>
          <name>Asg_Set_Flag</name>
          <label>Set Flag</label>
          <locationX>0</locationX>
          <locationY>0</locationY>
          <assignmentItems>
              <assignToReference>v_Flag</assignToReference>
              <operator>Assign</operator>
              <value>
                  <stringValue>true</stringValue>
              </value>
          </assignmentItems>
          <connector>
              <targetReference>Dec_Check_Flag</targetReference>
          </connector>
      </assignments>
      <decisions>
          <name>Dec_Check_Flag</name>
          <label>Check Flag</label>
          <locationX>0</locationX>
          <locationY>0</locationY>
          <defaultConnector>
              <targetReference>End_Failure</targetReference>
          </defaultConnector>
          <defaultConnectorLabel>No</defaultConnectorLabel>
          <rules>
              <name>Yes</name>
              <conditionLogic>and</conditionLogic>
              <conditions>
                  <leftValueReference>v_Flag</leftValueReference>
                  <operator>EqualTo</operator>
                  <rightValue>
                      <booleanValue>true</booleanValue>
                  </rightValue>
              </conditions>
              <connector>
                  <targetReference>End_Success</targetReference>
              </connector>
              <label>Yes</label>
          </rules>
      </decisions>
      <start>
          <locationX>0</locationX>
          <locationY>0</locationY>
          <connector>
              <targetReference>Asg_Set_Flag</targetReference>
          </connector>
      </start>
  </Flow>
  ```

**Criterios de Aceptación**:
- Tests pasan
- **Test de ordenamiento valida elementos alfabéticos**
- **Test de minimal diffs** verifica cambios pequeños
- Golden file es XML válido deployable

---

## TASK 1.7: CLI Implementation (Minimal)

**Estado**: ⬜ Pending
**Prioridad**: Crítica
**Dependencias**: TASK 1.6
**Tiempo Estimado**: 6-8 horas

### Descripción
Implementar la interface de línea de comandos con comando `compile` y soporte para generar DSL en JSON/YAML y docs básicas.

### Archivos Afectados
- `src/cli/index.ts`
- `src/cli/commands/compile.ts`
- `src/utils/logger.ts`
- `src/utils/file-writer.ts`
- `package.json`

---

### Subtarea 1.7.1: Setup CLI framework

**Checklist**:
- [ ] Instalar Commander:
  ```bash
  npm install commander
  npm install -D @types/commander
  ```
- [ ] Crear `src/cli/index.ts`:
  ```typescript
  #!/usr/bin/env node

  import { Command } from 'commander';
  import { compileCommand } from './commands/compile';

  const program = new Command();

  program
    .name('mermaid-flow-compile')
    .description('Compile Mermaid flowcharts to Salesforce Flow metadata')
    .version('1.0.0-poc');

  program.addCommand(compileCommand);

  program.parse(process.argv);
  ```
- [ ] Configurar shebang en archivo compilado
- [ ] Agregar bin entry en `package.json`:
  ```json
  {
    "bin": {
      "mermaid-flow-compile": "./dist/cli/index.js"
    },
    "scripts": {
      "cli": "node ./dist/cli/index.js"
    }
  }
  ```
- [ ] Hacer ejecutable: `chmod +x dist/cli/index.js` (post-build)

**Criterios de Aceptación**:
- CLI ejecutable desde `npm run cli -- --help`
- Muestra ayuda correctamente

---

### Subtarea 1.7.2: Implementar comando compile (básico)

**Checklist**:
- [ ] Crear `src/cli/commands/compile.ts`:
  ```typescript
  import { Command } from 'commander';
  import * as fs from 'fs';
  import * as path from 'path';
  import { MermaidParser } from '../../parser/mermaid-parser';
  import { MetadataExtractor } from '../../extractor/metadata-extractor';
  import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';
  import { FlowValidator } from '../../validator/flow-validator';
  import { FlowXmlGenerator } from '../../generators/flow-xml-generator';
  import { logger } from '../../utils/logger';

  export const compileCommand = new Command('compile')
    .description('Compile Mermaid flowchart to Salesforce Flow')
    .requiredOption('--input <path>', 'Path to Mermaid file')
    .option('--out-flow <dir>', 'Output directory for Flow XML')
    .option('--out-json <dir>', 'Output directory for DSL JSON/YAML')
    .option('--dsl-format <format>', 'DSL format: json or yaml', 'json')
    .option('--out-docs <dir>', 'Output directory for documentation')
    .option('--verbose', 'Verbose logging', false)
    .action(async (options) => {
      try {
        await compileFlow(options);
        process.exit(0);
      } catch (error) {
        logger.error('Compilation failed', error);
        process.exit(2);
      }
    });

  async function compileFlow(options: any) {
    if (options.verbose) {
      logger.level = 'debug';
    }

    // Implementation in 1.7.3
  }
  ```

**Criterios de Aceptación**:
- Comando registrado con opciones
- Opciones parseadas correctamente

---

### Subtarea 1.7.3: Implementar workflow de compilación

**Checklist**:
- [ ] Implementar `compileFlow()`:
  ```typescript
  async function compileFlow(options: any) {
    logger.info(`Compiling: ${options.input}`);

    // 1. Read input
    const inputPath = path.resolve(options.input);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    const mermaidText = fs.readFileSync(inputPath, 'utf-8');
    logger.debug('Mermaid file loaded');

    // 2. Parse
    const parser = new MermaidParser();
    const graph = parser.parse(mermaidText);
    logger.info(`Parsed ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

    // 3. Extract metadata
    const extractor = new MetadataExtractor();
    const metadataMap = new Map();
    for (const node of graph.nodes) {
      const metadata = extractor.extract(node);
      metadataMap.set(node.id, metadata);
    }
    logger.debug('Metadata extracted');

    // 4. Build DSL
    const flowApiName = path.basename(inputPath, '.mmd');
    const flowLabel = flowApiName.replace(/_/g, ' ');
    const builder = new IntermediateModelBuilder();
    const dsl = builder.build(graph, metadataMap, flowApiName, flowLabel);
    logger.info(`Built DSL with ${dsl.elements.length} elements`);

    // 5. Validate
    const validator = new FlowValidator();
    const validationResult = validator.validate(dsl);

    if (validationResult.warnings.length > 0) {
      logger.warn(`Validation warnings (${validationResult.warnings.length}):`);
      validationResult.warnings.forEach(w => {
        logger.warn(`  - ${w.message}`);
      });
    }

    if (!validationResult.valid) {
      logger.error(`Validation errors (${validationResult.errors.length}):`);
      validationResult.errors.forEach(e => {
        logger.error(`  - ${e.message}`);
      });
      throw new Error('Validation failed');
    }

    logger.info('Validation passed');

    // 6. Generate outputs
    const outputs: string[] = [];

    // Generate Flow XML
    if (options.outFlow) {
      const xmlGenerator = new FlowXmlGenerator();
      const xml = xmlGenerator.generate(dsl);
      const outPath = path.join(options.outFlow, `${flowApiName}.flow-meta.xml`);
      writeOutput(outPath, xml);
      outputs.push(`Flow XML: ${outPath}`);
      logger.info(`Generated Flow XML: ${outPath}`);
    }

    // Generate DSL JSON/YAML
    if (options.outJson) {
      const dslContent = options.dslFormat === 'yaml'
        ? yamlStringify(dsl)
        : JSON.stringify(dsl, null, 2);
      const ext = options.dslFormat === 'yaml' ? '.flow.yaml' : '.flow.json';
      const outPath = path.join(options.outJson, `${flowApiName}${ext}`);
      writeOutput(outPath, dslContent);
      outputs.push(`DSL ${options.dslFormat.toUpperCase()}: ${outPath}`);
      logger.info(`Generated DSL: ${outPath}`);
    }

    // Generate docs (basic)
    if (options.outDocs) {
      // Implementation in DocsGenerator (simplified for PoC)
      const mermaidNormalized = generateNormalizedMermaid(dsl);
      const markdown = generateMarkdownSummary(dsl);

      const mmdPath = path.join(options.outDocs, `${flowApiName}.normalized.mmd`);
      const mdPath = path.join(options.outDocs, `${flowApiName}.summary.md`);

      writeOutput(mmdPath, mermaidNormalized);
      writeOutput(mdPath, markdown);

      outputs.push(`Docs: ${options.outDocs}`);
      logger.info(`Generated docs: ${options.outDocs}`);
    }

    logger.info('✓ Compilation successful');
    outputs.forEach(o => logger.info(`  ${o}`));
  }

  function writeOutput(filePath: string, content: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  function yamlStringify(obj: any): string {
    // Simple YAML serialization (or use a library like 'js-yaml')
    // For PoC, can use JSON with comments
    return JSON.stringify(obj, null, 2);
  }

  function generateNormalizedMermaid(dsl: any): string {
    // Simplified: regenerate Mermaid from DSL
    return `flowchart TD\n  %% Normalized from DSL\n  %% TODO: Implement`;
  }

  function generateMarkdownSummary(dsl: any): string {
    return `# Flow: ${dsl.label}\n\n**API Name**: ${dsl.flowApiName}\n\n**Elements**: ${dsl.elements.length}`;
  }
  ```

**Criterios de Aceptación**:
- Pipeline completo ejecuta sin errores
- Genera Flow XML si `--out-flow` especificado
- Genera DSL JSON/YAML si `--out-json` especificado
- Genera docs si `--out-docs` especificado

---

### Subtarea 1.7.4: Implementar manejo de errores

**Checklist**:
- [ ] Try-catch en cada etapa del pipeline
- [ ] Mensajes de error claros:
  ```typescript
  try {
    const graph = parser.parse(mermaidText);
  } catch (error) {
    logger.error('Failed to parse Mermaid diagram');
    throw new Error(`Parse error: ${error.message}`);
  }
  ```
- [ ] Exit codes:
  - 0: success
  - 1: validation errors
  - 2: internal errors
- [ ] Implementar en `compileCommand.action()`:
  ```typescript
  .action(async (options) => {
    try {
      await compileFlow(options);
      process.exit(0);
    } catch (error) {
      if (error.message.includes('Validation failed')) {
        process.exit(1);
      } else {
        process.exit(2);
      }
    }
  });
  ```

**Criterios de Aceptación**:
- Errores capturados y reportados
- Exit codes correctos

---

### Subtarea 1.7.5: Agregar logging básico

**Checklist**:
- [ ] Instalar Winston:
  ```bash
  npm install winston
  npm install -D @types/winston
  ```
- [ ] Crear `src/utils/logger.ts`:
  ```typescript
  import winston from 'winston';

  export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
    transports: [
      new winston.transports.Console(),
    ],
  });
  ```
- [ ] Usar en compile:
  ```typescript
  logger.info('Starting compilation...');
  logger.debug('Detailed debug info');
  logger.warn('Warning message');
  logger.error('Error message');
  ```

**Criterios de Aceptación**:
- Logging funcional
- `--verbose` activa debug logs

---

### Subtarea 1.7.6: Tests de integración CLI

**Checklist**:
- [ ] Crear `src/__tests__/cli.integration.test.ts`:
  ```typescript
  import * as fs from 'fs';
  import * as path from 'path';
  import { execSync } from 'child_process';

  describe('CLI Integration', () => {
    const exampleMmd = path.join(__dirname, '../../examples/poc/simple-flow.mmd');
    const outputDir = path.join(__dirname, '../../output-test');

    beforeAll(() => {
      // Ensure output dir is clean
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true });
      }
    });

    afterAll(() => {
      // Cleanup
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true });
      }
    });

    test('should compile example and generate outputs', () => {
      const cmd = `npm run cli -- compile --input ${exampleMmd} --out-flow ${outputDir}/flows --out-json ${outputDir}/dsl`;

      execSync(cmd, { stdio: 'inherit' });

      // Check outputs exist
      const flowXmlPath = path.join(outputDir, 'flows', 'simple-flow.flow-meta.xml');
      const dslJsonPath = path.join(outputDir, 'dsl', 'simple-flow.flow.json');

      expect(fs.existsSync(flowXmlPath)).toBe(true);
      expect(fs.existsSync(dslJsonPath)).toBe(true);
    });

    test('should error on invalid input', () => {
      expect(() => {
        execSync('npm run cli -- compile --input nonexistent.mmd');
      }).toThrow();
    });
  });
  ```

**Criterios de Aceptación**:
- Test de end-to-end CLI pasa
- Test de error handling pasa

---

## TASK 1.8: Integration Test - PoC End-to-End

**Estado**: ⬜ Pending
**Prioridad**: Crítica
**Dependencias**: TASK 1.7
**Tiempo Estimado**: 4-6 horas

### Descripción
Crear ejemplo completo de Mermaid, compilar end-to-end, comparar con golden file, y validar deploy a Salesforce.

### Archivos Afectados
- `examples/poc/simple-flow.mmd`
- `examples/poc/simple-flow.flow-meta.xml` (golden file)
- `src/__tests__/integration/poc-e2e.test.ts`
- `docs/poc-results.md`
- `docs/mermaid-conventions-poc.md`

---

### Subtarea 1.8.1: Crear ejemplo Mermaid simple

**Checklist**:
- [ ] Crear `examples/poc/simple-flow.mmd`:
  ```mermaid
  flowchart TD
      Start([START: Flow Start])

      Assign["ASSIGNMENT: Set Flag
               api: Asg_Set_Flag
               set: v_Flag = true"]

      Decision{"DECISION: Check Flag
                api: Dec_Check_Flag
                label: Check Flag"}

      End1([END: Success])
      End2([END: Failure])

      Start --> Assign
      Assign --> Decision
      Decision -->|Yes| End1
      Decision -->|No (default)| End2
  ```

**Criterios de Aceptación**:
- Mermaid válido y renderizable
- Usa las 4 tipos de elemento PoC

---

### Subtarea 1.8.2: Crear "golden file" XML esperado

**Checklist**:
- [ ] Generar XML inicial compilando el ejemplo
- [ ] Ajustar manualmente si necesario
- [ ] Guardar como `examples/poc/simple-flow.flow-meta.xml`
- [ ] Verificar que XML es bien formado
- [ ] Elementos ordenados alfabéticamente

**Criterios de Aceptación**:
- XML válido según schema Salesforce
- Deployable a scratch org

---

### Subtarea 1.8.3: Implementar test de integración

**Checklist**:
- [ ] Crear `src/__tests__/integration/poc-e2e.test.ts`:
  ```typescript
  import * as fs from 'fs';
  import * as path from 'path';
  import { MermaidParser } from '../../parser/mermaid-parser';
  import { MetadataExtractor } from '../../extractor/metadata-extractor';
  import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';
  import { FlowValidator } from '../../validator/flow-validator';
  import { FlowXmlGenerator } from '../../generators/flow-xml-generator';

  describe('PoC End-to-End Integration', () => {
    const mmdPath = path.join(__dirname, '../../../examples/poc/simple-flow.mmd');
    const goldenXmlPath = path.join(__dirname, '../../../examples/poc/simple-flow.flow-meta.xml');

    test('should compile Mermaid to Flow XML matching golden file', () => {
      // Read Mermaid
      const mermaidText = fs.readFileSync(mmdPath, 'utf-8');

      // Parse
      const parser = new MermaidParser();
      const graph = parser.parse(mermaidText);

      // Extract metadata
      const extractor = new MetadataExtractor();
      const metadataMap = new Map();
      for (const node of graph.nodes) {
        metadataMap.set(node.id, extractor.extract(node));
      }

      // Build DSL
      const builder = new IntermediateModelBuilder();
      const dsl = builder.build(graph, metadataMap, 'SimpleFlow', 'Simple Flow');

      // Validate
      const validator = new FlowValidator();
      const result = validator.validate(dsl);
      expect(result.valid).toBe(true);

      // Generate XML
      const generator = new FlowXmlGenerator();
      const xml = generator.generate(dsl);

      // Compare with golden file
      const goldenXml = fs.readFileSync(goldenXmlPath, 'utf-8');

      // Normalize whitespace for comparison
      const normalizeXml = (str: string) => str.replace(/\s+/g, ' ').trim();

      expect(normalizeXml(xml)).toBe(normalizeXml(goldenXml));
    });

    test('should produce identical output on repeated compilation', () => {
      const mermaidText = fs.readFileSync(mmdPath, 'utf-8');

      const compile = () => {
        const parser = new MermaidParser();
        const graph = parser.parse(mermaidText);

        const extractor = new MetadataExtractor();
        const metadataMap = new Map();
        for (const node of graph.nodes) {
          metadataMap.set(node.id, extractor.extract(node));
        }

        const builder = new IntermediateModelBuilder();
        const dsl = builder.build(graph, metadataMap, 'SimpleFlow', 'Simple Flow');

        const generator = new FlowXmlGenerator();
        return generator.generate(dsl);
      };

      const output1 = compile();
      const output2 = compile();

      // Outputs should be byte-for-byte identical
      expect(output1).toBe(output2);
    });

    test('should generate valid DSL JSON', () => {
      const mermaidText = fs.readFileSync(mmdPath, 'utf-8');
      const parser = new MermaidParser();
      const graph = parser.parse(mermaidText);

      const extractor = new MetadataExtractor();
      const metadataMap = new Map();
      for (const node of graph.nodes) {
        metadataMap.set(node.id, extractor.extract(node));
      }

      const builder = new IntermediateModelBuilder();
      const dsl = builder.build(graph, metadataMap, 'SimpleFlow', 'Simple Flow');

      // Should be serializable to JSON
      const json = JSON.stringify(dsl, null, 2);
      expect(json).toBeTruthy();

      // Should be parseable back
      const parsed = JSON.parse(json);
      expect(parsed.flowApiName).toBe('SimpleFlow');
      expect(parsed.elements.length).toBeGreaterThan(0);
    });
  });
  ```

**Criterios de Aceptación**:
- Test compara con golden file
- Test valida determinismo (compile 2x → mismo output)
- Test valida DSL JSON serialization

---

### Subtarea 1.8.4: Validar en Salesforce (manual para PoC)

**Checklist**:
- [ ] Crear scratch org:
  ```bash
  sfdx force:org:create -f config/project-scratch-def.json -a mermaid-poc
  ```
- [ ] Deploy Flow generado:
  ```bash
  sfdx force:source:deploy -m Flow:SimpleFlow -u mermaid-poc
  ```
- [ ] Abrir Flow Builder:
  ```bash
  sfdx force:org:open -u mermaid-poc -p /lightning/setup/Flows/home
  ```
- [ ] Verificar:
  - Flow se abre sin errores
  - Elementos aparecen correctamente
  - Conexiones son correctas
- [ ] Ejecutar Flow manualmente
- [ ] Tomar screenshots

**Criterios de Aceptación**:
- Flow deployable sin errores
- Flow abre en Flow Builder
- Estructura es correcta visualmente

---

### Subtarea 1.8.5: Documentar resultado PoC

**Checklist**:
- [ ] Crear `docs/poc-results.md`:
  ```markdown
  # PoC Results - Fase 1

  **Fecha**: 2025-12-05
  **Estado**: ✅ Completado

  ## Resumen

  El PoC ha validado exitosamente el pipeline Mermaid → DSL → Flow XML.

  ## Elementos Implementados

  - ✅ Start
  - ✅ End
  - ✅ Assignment
  - ✅ Decision

  ## Tests

  - ✅ Unit tests: 45 tests, 100% pass rate
  - ✅ Integration tests: 3 tests, 100% pass rate
  - ✅ Coverage: 85%

  ## Validación Salesforce

  - ✅ XML deployable a scratch org
  - ✅ Flow abre en Flow Builder
  - ✅ Flow ejecutable

  ## Screenshots

  ![Flow Builder](./screenshots/flow-builder-poc.png)

  ## Limitaciones Encontradas

  1. Parser de Mermaid es básico (regex-based)
  2. No soporta loops ni elementos avanzados
  3. Inferencia de dataType es simplificada

  ## Recomendaciones para v1

  1. Usar librería Mermaid oficial para parsing
  2. Agregar soporte para Screen, RecordCreate, RecordUpdate, Subflow
  3. Validación semántica con org metadata
  4. Mejorar generación de docs
  ```
- [ ] Crear `docs/mermaid-conventions-poc.md`:
  ```markdown
  # Mermaid Conventions - PoC

  ## General Structure

  ```mermaid
  flowchart TD
    Start([START: Label])
    ...
  ```

  ## Element Types

  ### Start
  ```
  Start([START: Flow Start])
  ```

  ### End
  ```
  End([END: Flow End])
  ```

  ### Assignment
  ```
  Asg["ASSIGNMENT: Set Variables
       api: Asg_Set_Vars
       set: v_Flag = true
       set: v_Count = 0"]
  ```

  ### Decision
  ```
  Dec{"DECISION: Check Condition
       api: Dec_Check"}

  Dec -->|Yes| NextNode
  Dec -->|No (default)| OtherNode
  ```

  ## Best Practices

  - Always include `api:` for explicit API names
  - Use `(default)` in edge label for default outcome
  - Order nodes logically (top-to-bottom or left-to-right)
  ```

**Criterios de Aceptación**:
- Documentación completa del PoC
- Screenshots incluidos
- Convenciones documentadas

---

## ENTREGABLES

### Entregables de Código

✅ **CLI Funcional**
- Comando `compile` con opciones completas
- Soporte JSON y YAML para DSL
- Generación de docs básicas

✅ **Pipeline Completo**
- MermaidParser
- MetadataExtractor
- IntermediateModelBuilder
- FlowValidator
- FlowXmlGenerator

✅ **Tipos TypeScript**
- Todas las interfaces definidas
- Type safety completo

✅ **Suite de Tests**
- Unit tests por módulo
- Integration tests end-to-end
- Coverage > 80%

### Entregables de Documentación

✅ **Guía de Convenciones Mermaid**
- `docs/mermaid-conventions-poc.md`

✅ **Resultados del PoC**
- `docs/poc-results.md`
- Screenshots de Flow Builder

✅ **Ejemplos**
- `examples/poc/simple-flow.mmd`
- `examples/poc/simple-flow.flow-meta.xml` (golden file)

### Outputs Generados

✅ **Flow XML**
- Deployable a Salesforce
- Elementos ordenados alfabéticamente
- Diffs mínimos

✅ **Flow DSL**
- JSON y YAML
- Salida determinista
- Versionable en Git

---

## CRITERIOS DE ÉXITO

### Criterios Técnicos

| Criterio | Objetivo | Verificación |
|----------|----------|--------------|
| **Build Success** | `npm run build` sin errores | ✅ Build completo |
| **Test Coverage** | > 80% coverage | ✅ `npm run test:coverage` |
| **All Tests Pass** | 100% tests passing | ✅ `npm test` |
| **Linting** | 0 lint errors | ✅ `npm run lint` |
| **Type Safety** | 0 TypeScript errors | ✅ `npm run type-check` |

### Criterios Funcionales

| Criterio | Objetivo | Verificación |
|----------|----------|--------------|
| **Parse Mermaid** | Parsear diagrama con 4 elementos | ✅ Test unitario |
| **Extract Metadata** | Extraer tipo + properties | ✅ Test unitario |
| **Build DSL** | Generar DSL válido | ✅ Test unitario |
| **Validate DSL** | Detectar errores estructurales | ✅ Test unitario |
| **Generate XML** | XML deployable a SF | ✅ Test integración + deploy manual |
| **Deterministic Output** | 2x compile → mismo output | ✅ Test integración |
| **Minimal Diffs** | Cambio pequeño → diff pequeño | ✅ Test unitario |

### Criterios de Integración Salesforce

| Criterio | Objetivo | Verificación |
|----------|----------|--------------|
| **Deploy Success** | `sfdx deploy` exitoso | ✅ Deploy manual |
| **Flow Builder** | Flow abre sin errores | ✅ Verificación manual |
| **Execution** | Flow ejecutable | ✅ Test manual en org |

---

## DEPENDENCIAS ENTRE TAREAS

```
TASK 1.0 (Setup)
    ↓
TASK 1.1 (Types)
    ↓
TASK 1.2 (Parser) ─────┐
    ↓                  │
TASK 1.3 (Extractor)   │
    ↓                  │
TASK 1.4 (Builder) ────┤
    ↓                  │
TASK 1.5 (Validator)   │
    ↓                  │
TASK 1.6 (XML Gen) ────┤
    ↓                  │
TASK 1.7 (CLI) ────────┘
    ↓
TASK 1.8 (Integration Test)
```

### Dependencias Críticas

- **1.1 → 1.2**: Parser necesita tipos de Mermaid
- **1.2 → 1.3**: Extractor necesita grafo parseado
- **1.3 → 1.4**: Builder necesita metadata
- **1.4 → 1.5**: Validator necesita DSL
- **1.5 → 1.6**: XML Generator necesita DSL validado
- **1.6 → 1.7**: CLI integra todos los módulos
- **1.7 → 1.8**: Integration test usa CLI

---

## COMANDOS DE DESARROLLO

### Setup Inicial

```bash
# Instalar dependencias
npm install

# Build
npm run build

# Verificar instalación
npm run cli -- --help
```

### Desarrollo

```bash
# Watch mode (recompila automáticamente)
npm run dev

# En otra terminal, ejecutar CLI
npm run cli -- compile --input examples/poc/simple-flow.mmd --out-flow ./output
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Test específico
npm test -- parser.test.ts
```

### Linting y Formatting

```bash
# Lint
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

### Compilación End-to-End

```bash
# Compile ejemplo PoC
npm run cli -- compile \
  --input examples/poc/simple-flow.mmd \
  --out-flow ./output/flows \
  --out-json ./output/dsl \
  --out-docs ./output/docs \
  --dsl-format json \
  --verbose

# Verificar outputs
ls -la output/flows/
ls -la output/dsl/
ls -la output/docs/
```

### Validar Determinismo

```bash
# Compilar 2 veces
npm run cli -- compile --input examples/poc/simple-flow.mmd --out-json ./output1
npm run cli -- compile --input examples/poc/simple-flow.mmd --out-json ./output2

# Comparar (debe ser idéntico)
diff output1/simple-flow.flow.json output2/simple-flow.flow.json
```

### Deploy a Salesforce (Manual)

```bash
# Crear scratch org
sfdx force:org:create -f config/project-scratch-def.json -a mermaid-poc

# Deploy flow
sfdx force:source:deploy \
  -m Flow:SimpleFlow \
  -u mermaid-poc

# Abrir Flow Builder
sfdx force:org:open -u mermaid-poc -p /lightning/setup/Flows/home
```

---

## TESTING STRATEGY

### Pirámide de Tests

```
        /\
       /  \  Integration (E2E)
      /────\
     /      \  Unit Tests
    /────────\
   /__________\
```

### Unit Tests (70% del esfuerzo)

**Por módulo**:
- `parser.test.ts`: Parsear Mermaid correctamente
- `extractor.test.ts`: Extraer metadata correctamente
- `builder.test.ts`: Construir DSL correctamente
- `validator.test.ts`: Validar DSL correctamente
- `xml-generator.test.ts`: Generar XML correctamente

**Cobertura objetivo**: 90%+

### Integration Tests (30% del esfuerzo)

**End-to-end**:
- `poc-e2e.test.ts`: Pipeline completo Mermaid → XML
- `cli.integration.test.ts`: CLI compile command
- Comparación con golden files
- Tests de determinismo

**Cobertura objetivo**: 100% de paths críticos

### Estrategia TDD

1. **Escribir test primero** (falla)
2. **Implementar mínimo** para pasar test
3. **Refactorizar** manteniendo tests verdes
4. **Repetir**

### Golden Files

- `examples/poc/simple-flow.flow-meta.xml`: Output esperado
- Tests comparan output generado vs golden file
- Golden file se actualiza solo con aprobación explícita

---

## TROUBLESHOOTING

### Problema: `npm run build` falla

**Solución**:
```bash
# Limpiar dist
npm run clean

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Re-build
npm run build
```

### Problema: Tests fallan con "Cannot find module"

**Solución**:
```bash
# Asegurar que build está actualizado
npm run build

# Verificar tsconfig paths
# Verificar jest.config.js moduleNameMapper
```

### Problema: XML generado no es válido

**Solución**:
- Verificar que elementos están ordenados alfabéticamente
- Verificar escaping de caracteres especiales en labels
- Validar XML con herramienta externa (xmllint)

```bash
xmllint --noout output/flows/SimpleFlow.flow-meta.xml
```

### Problema: Flow no deploya a Salesforce

**Solución**:
- Verificar apiVersion es compatible (>= 60.0)
- Verificar que processType es válido
- Verificar que todos los elementos tienen locationX/locationY
- Revisar logs de deploy: `sfdx force:source:deploy --loglevel debug`

### Problema: Output no es determinista

**Solución**:
- Verificar que todos los arrays se ordenan antes de serializar:
  - Elementos por API name
  - Assignments por variable name
  - Outcomes (default al final)
  - Variables por name
- Evitar uso de `Map` sin ordenar keys
- Evitar timestamps o IDs aleatorios

### Problema: Diffs muy grandes en cambios pequeños

**Solución**:
- Revisar ordenamiento de elementos XML
- Verificar que spacing es consistente
- No incluir metadata innecesario (comments, etc.)
- Usar formato consistente (indentación, line breaks)

---

## PRÓXIMOS PASOS (Post-PoC)

Una vez completada la Fase 1, proceder con:

### Fase 2 - v1 Usable

1. **Agregar elementos v1**:
   - Screen
   - RecordCreate
   - RecordUpdate
   - Subflow

2. **Validación semántica**:
   - Integración con `--org-meta`
   - Validar objetos y campos
   - Validar expresiones Salesforce

3. **CLI enhancement**:
   - Comando `lint`
   - Modo `--strict`
   - DocsGenerator completo

4. **CI/CD**:
   - GitHub Actions
   - Automated testing
   - Deployment pipeline

---

**FIN DE FASE 1**