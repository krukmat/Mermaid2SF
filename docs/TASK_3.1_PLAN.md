# TASK 3.1: Command - Explain - Plan de Implementación

## 📋 Resumen Ejecutivo

**Objetivo**: Implementar comando `explain` que analiza flows y genera reportes legibles sobre su estructura, complejidad y recomendaciones de mejora.

**Estado**: ⬜ Pending
**Prioridad**: Media
**Fase**: 3 - Developer Experience Enhancements
**Dependencias**: ✅ TASK 3.0 completada

## 🎯 Objetivos de la Tarea

1. **Análisis de Flows**: Generar resúmenes comprensibles de flows compilados
2. **Métricas de Complejidad**: Calcular complejidad ciclomática y detectar paths críticos
3. **Recomendaciones**: Detectar anti-patterns y sugerir mejoras
4. **Múltiples Formatos**: Soportar output en text, JSON y HTML

## 📊 Subtareas Detalladas

### 3.1.1: Implementar Comando Explain ✅

**Archivo**: `src/cli/commands/explain.ts`

**Funcionalidad**:
- Input: Acepta archivo Mermaid (.mmd) o DSL (.flow.json)
- Parser: Reutiliza pipeline existente (MermaidParser → DSL)
- Output: Genera summary human-readable

**Interfaz CLI**:
```bash
# Uso básico
mermaid-flow-compile explain --input my-flow.mmd

# Con formato específico
mermaid-flow-compile explain --input my-flow.mmd --format json

# Con output file
mermaid-flow-compile explain --input my-flow.mmd --output report.txt
```

**Opciones**:
- `--input <path>` (requerido): Path to Mermaid or DSL file
- `--format <format>` (opcional): Output format (text, json, html) - default: text
- `--output <path>` (opcional): Output file path - default: stdout
- `--verbose` (opcional): Include detailed metrics

**Estructura del Comando**:
```typescript
// src/cli/commands/explain.ts
import { Command } from 'commander';
import { FlowExplainer } from '../../explainer/flow-explainer';
import { MermaidParser } from '../../parser/mermaid-parser';
import { IntermediateModelBuilder } from '../../dsl/intermediate-model-builder';

export function registerExplainCommand(program: Command): void {
  program
    .command('explain')
    .description('Generate analysis and explanation of a Flow')
    .requiredOption('--input <path>', 'Path to Mermaid or DSL file')
    .option('--format <format>', 'Output format (text, json, html)', 'text')
    .option('--output <path>', 'Output file path')
    .option('--verbose', 'Include detailed metrics')
    .action(async (options) => {
      // Implementation
    });
}
```

**Salida de Ejemplo (Text Format)**:
```
=== Flow Analysis ===

Flow: Customer Onboarding Flow
Type: Screen Flow
API Version: 60.0

SUMMARY:
This flow handles customer onboarding with data collection,
conditional account creation/update, and email notification.

STRUCTURE:
- Total Elements: 8
  - Start: 1
  - Screen: 1
  - Assignment: 1
  - Decision: 1
  - RecordCreate: 1
  - RecordUpdate: 1
  - Subflow: 1
  - End: 1

PATHS:
- Main Path: Start → Screen → Assignment → Decision → Create → Subflow → End (7 steps)
- Alternative Path: Start → Screen → Assignment → Decision → Update → Subflow → End (7 steps)

COMPLEXITY:
- Cyclomatic Complexity: 2
- Maximum Depth: 7
- Decision Points: 1
- Complexity Score: LOW

VARIABLES:
- Declared: 3 (customerName, accountId, emailSent)
- Used: 3
- Unused: 0

RECOMMENDATIONS:
✓ Flow structure looks good
✓ No anti-patterns detected
! Consider: Add error handling after RecordCreate/Update operations
```

---

### 3.1.2: Generar Análisis de Complejidad ✅

**Archivo**: `src/explainer/complexity-analyzer.ts`

**Métricas a Calcular**:

1. **Conteo de Elementos**:
   - Total de elementos por tipo
   - Profundidad máxima del flow
   - Número de branches (Decision outcomes)

2. **Complejidad Ciclomática**:
   - Formula: `M = E - N + 2P`
     - E = edges (connections)
     - N = nodes (elements)
     - P = connected components (normalmente 1)
   - Para flows: `M = (número de decisiones) + 1`

3. **Paths Críticos**:
   - Identificar path más largo (mayor profundidad)
   - Identificar paths con más operaciones de escritura
   - Detectar paths sin End element

4. **Scoring de Complejidad**:
   ```typescript
   enum ComplexityLevel {
     LOW = 'LOW',        // Cyclomatic < 5
     MEDIUM = 'MEDIUM',  // Cyclomatic 5-10
     HIGH = 'HIGH',      // Cyclomatic 11-20
     VERY_HIGH = 'VERY_HIGH' // Cyclomatic > 20
   }
   ```

**Interfaz**:
```typescript
export interface ComplexityMetrics {
  // Element counts
  totalElements: number;
  elementCounts: Record<ElementType, number>;

  // Depth metrics
  maxDepth: number;
  averageDepth: number;

  // Path metrics
  totalPaths: number;
  criticalPath: {
    length: number;
    elements: string[]; // element IDs
  };

  // Complexity metrics
  cyclomaticComplexity: number;
  complexityLevel: ComplexityLevel;
  decisionPoints: number;

  // Variable metrics
  declaredVariables: number;
  usedVariables: number;
  unusedVariables: string[];
}

export class ComplexityAnalyzer {
  analyze(dsl: FlowDSL): ComplexityMetrics {
    // Implementation
  }

  private calculateCyclomaticComplexity(dsl: FlowDSL): number {
    // Count decision points
    const decisions = dsl.elements.filter(e => e.type === 'Decision');
    return decisions.length + 1;
  }

  private findCriticalPath(dsl: FlowDSL): { length: number; elements: string[] } {
    // DFS/BFS to find longest path
  }

  private analyzeVariables(dsl: FlowDSL): {
    declared: number;
    used: number;
    unused: string[];
  } {
    // Analyze variable usage
  }
}
```

---

### 3.1.3: Generar Recomendaciones ✅

**Archivo**: `src/explainer/recommendation-engine.ts`

**Anti-Patterns a Detectar**:

1. **Flow sin End Element**:
   ```
   ❌ ANTI-PATTERN: Missing End Element
   Some paths don't reach an End element.
   FIX: Ensure all execution paths terminate with an End element.
   ```

2. **Variables No Utilizadas**:
   ```
   ⚠️ WARNING: Unused Variables
   Variables declared but never used: customerType, tempValue
   FIX: Remove unused variable declarations or use them in the flow.
   ```

3. **Decision sin Default Outcome**:
   ```
   ❌ ANTI-PATTERN: Decision Without Default
   Decision 'Check_Status' has no default outcome.
   FIX: Add a default outcome to handle unexpected values.
   ```

4. **Ciclos Infinitos**:
   ```
   ❌ CRITICAL: Infinite Loop Detected
   Path creates a cycle: A → B → C → A
   FIX: Ensure all loops have exit conditions.
   ```

5. **Flow Demasiado Profundo**:
   ```
   ⚠️ WARNING: Deep Flow Structure
   Maximum depth is 15 elements (recommended: < 10).
   FIX: Consider breaking into subflows for better maintainability.
   ```

6. **Demasiadas Decision Points**:
   ```
   ⚠️ WARNING: High Complexity
   Cyclomatic complexity is 12 (recommended: < 10).
   FIX: Simplify logic or break into subflows.
   ```

**Interfaz**:
```typescript
export enum RecommendationType {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
}

export interface Recommendation {
  type: RecommendationType;
  code: string;
  title: string;
  description: string;
  fix?: string;
  elementId?: string;
}

export class RecommendationEngine {
  generateRecommendations(dsl: FlowDSL, metrics: ComplexityMetrics): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for anti-patterns
    this.checkMissingEnd(dsl, recommendations);
    this.checkUnusedVariables(metrics, recommendations);
    this.checkDecisionDefaults(dsl, recommendations);
    this.checkComplexity(metrics, recommendations);
    this.checkDepth(metrics, recommendations);

    // Add success message if no issues
    if (recommendations.length === 0) {
      recommendations.push({
        type: RecommendationType.SUCCESS,
        code: 'FLOW_OK',
        title: 'Flow Structure Looks Good',
        description: 'No anti-patterns or issues detected.',
      });
    }

    return recommendations;
  }

  private checkMissingEnd(dsl: FlowDSL, recommendations: Recommendation[]): void {
    // Check if all paths reach an End element
  }

  private checkUnusedVariables(metrics: ComplexityMetrics, recommendations: Recommendation[]): void {
    if (metrics.unusedVariables.length > 0) {
      recommendations.push({
        type: RecommendationType.WARNING,
        code: 'UNUSED_VARIABLES',
        title: 'Unused Variables',
        description: `Variables declared but never used: ${metrics.unusedVariables.join(', ')}`,
        fix: 'Remove unused variable declarations or use them in the flow.',
      });
    }
  }

  private checkDecisionDefaults(dsl: FlowDSL, recommendations: Recommendation[]): void {
    const decisions = dsl.elements.filter(e => e.type === 'Decision') as DecisionElement[];
    for (const decision of decisions) {
      const hasDefault = decision.outcomes.some(o => o.isDefault);
      if (!hasDefault) {
        recommendations.push({
          type: RecommendationType.CRITICAL,
          code: 'MISSING_DEFAULT_OUTCOME',
          title: 'Decision Without Default',
          description: `Decision '${decision.apiName}' has no default outcome.`,
          fix: 'Add a default outcome to handle unexpected values.',
          elementId: decision.id,
        });
      }
    }
  }

  private checkComplexity(metrics: ComplexityMetrics, recommendations: Recommendation[]): void {
    if (metrics.complexityLevel === ComplexityLevel.HIGH ||
        metrics.complexityLevel === ComplexityLevel.VERY_HIGH) {
      recommendations.push({
        type: RecommendationType.WARNING,
        code: 'HIGH_COMPLEXITY',
        title: 'High Complexity',
        description: `Cyclomatic complexity is ${metrics.cyclomaticComplexity} (recommended: < 10).`,
        fix: 'Simplify logic or break into subflows.',
      });
    }
  }

  private checkDepth(metrics: ComplexityMetrics, recommendations: Recommendation[]): void {
    if (metrics.maxDepth > 10) {
      recommendations.push({
        type: RecommendationType.WARNING,
        code: 'DEEP_FLOW',
        title: 'Deep Flow Structure',
        description: `Maximum depth is ${metrics.maxDepth} elements (recommended: < 10).`,
        fix: 'Consider breaking into subflows for better maintainability.',
      });
    }
  }
}
```

---

### 3.1.4: Output Formats ✅

**Archivo**: `src/explainer/output-formatters.ts`

**1. Plain Text Format**:
```typescript
export class TextFormatter {
  format(explanation: FlowExplanation): string {
    // Generate plain text report (example shown in 3.1.1)
  }
}
```

**2. JSON Format**:
```typescript
export class JsonFormatter {
  format(explanation: FlowExplanation): string {
    return JSON.stringify(explanation, null, 2);
  }
}
```

**Ejemplo JSON Output**:
```json
{
  "flow": {
    "apiName": "Customer_Onboarding_Flow",
    "label": "Customer Onboarding Flow",
    "processType": "Screen",
    "apiVersion": "60.0"
  },
  "summary": "This flow handles customer onboarding...",
  "structure": {
    "totalElements": 8,
    "elementCounts": {
      "Start": 1,
      "Screen": 1,
      "Assignment": 1,
      "Decision": 1,
      "RecordCreate": 1,
      "RecordUpdate": 1,
      "Subflow": 1,
      "End": 1
    }
  },
  "complexity": {
    "cyclomaticComplexity": 2,
    "complexityLevel": "LOW",
    "maxDepth": 7,
    "totalPaths": 2,
    "criticalPath": {
      "length": 7,
      "elements": ["START_1", "SCREEN_1", "ASSIGN_1", "DECISION_1", "CREATE_1", "SUBFLOW_1", "END_1"]
    }
  },
  "variables": {
    "declared": 3,
    "used": 3,
    "unused": []
  },
  "recommendations": [
    {
      "type": "SUCCESS",
      "code": "FLOW_OK",
      "title": "Flow Structure Looks Good",
      "description": "No anti-patterns or issues detected."
    }
  ]
}
```

**3. HTML Format** (Opcional):
```typescript
export class HtmlFormatter {
  format(explanation: FlowExplanation): string {
    // Generate HTML report with:
    // - CSS styling
    // - Collapsible sections
    // - Syntax highlighting for code
    // - Visual indicators for complexity levels
  }
}
```

**FlowExplainer Principal**:
```typescript
export interface FlowExplanation {
  flow: {
    apiName: string;
    label: string;
    processType: string;
    apiVersion: string;
  };
  summary: string;
  structure: {
    totalElements: number;
    elementCounts: Record<ElementType, number>;
  };
  complexity: ComplexityMetrics;
  variables: {
    declared: number;
    used: number;
    unused: string[];
  };
  recommendations: Recommendation[];
}

export class FlowExplainer {
  private complexityAnalyzer = new ComplexityAnalyzer();
  private recommendationEngine = new RecommendationEngine();

  explain(dsl: FlowDSL): FlowExplanation {
    const metrics = this.complexityAnalyzer.analyze(dsl);
    const recommendations = this.recommendationEngine.generateRecommendations(dsl, metrics);

    return {
      flow: {
        apiName: dsl.flowApiName,
        label: dsl.label,
        processType: dsl.processType,
        apiVersion: dsl.apiVersion || '60.0',
      },
      summary: this.generateSummary(dsl),
      structure: {
        totalElements: metrics.totalElements,
        elementCounts: metrics.elementCounts,
      },
      complexity: metrics,
      variables: {
        declared: metrics.declaredVariables,
        used: metrics.usedVariables,
        unused: metrics.unusedVariables,
      },
      recommendations,
    };
  }

  private generateSummary(dsl: FlowDSL): string {
    // Generate human-readable summary based on flow structure
  }

  formatOutput(explanation: FlowExplanation, format: 'text' | 'json' | 'html'): string {
    switch (format) {
      case 'json':
        return new JsonFormatter().format(explanation);
      case 'html':
        return new HtmlFormatter().format(explanation);
      case 'text':
      default:
        return new TextFormatter().format(explanation);
    }
  }
}
```

---

### 3.1.5: Tests para Explain ✅

**Archivo**: `src/__tests__/flow-explainer.test.ts`

**Test Cases**:

1. **Summary Generation**:
   ```typescript
   describe('FlowExplainer - Summary', () => {
     it('should generate summary for simple flow');
     it('should generate summary for complex flow');
     it('should describe flow purpose correctly');
   });
   ```

2. **Complexity Analysis**:
   ```typescript
   describe('ComplexityAnalyzer', () => {
     it('should calculate cyclomatic complexity correctly');
     it('should identify critical path');
     it('should count elements by type');
     it('should detect unused variables');
     it('should calculate max depth');
     it('should assign complexity level correctly');
   });
   ```

3. **Recommendations**:
   ```typescript
   describe('RecommendationEngine', () => {
     it('should detect missing End element');
     it('should detect unused variables');
     it('should detect decision without default');
     it('should detect high complexity');
     it('should detect deep flow structure');
     it('should return success when no issues');
   });
   ```

4. **Output Formatters**:
   ```typescript
   describe('Output Formatters', () => {
     it('should format as plain text');
     it('should format as JSON');
     it('should format as HTML');
     it('should include all sections in output');
   });
   ```

5. **Integration Tests**:
   ```typescript
   describe('Explain Command Integration', () => {
     it('should explain flow from Mermaid file');
     it('should explain flow from DSL file');
     it('should write output to file');
     it('should output to stdout by default');
   });
   ```

**Ejemplo de Test**:
```typescript
describe('ComplexityAnalyzer', () => {
  let analyzer: ComplexityAnalyzer;

  beforeEach(() => {
    analyzer = new ComplexityAnalyzer();
  });

  it('should calculate cyclomatic complexity correctly', () => {
    const dsl: FlowDSL = {
      version: 1,
      flowApiName: 'Test_Flow',
      label: 'Test Flow',
      processType: 'Autolaunched',
      startElement: 'START_1',
      elements: [
        { id: 'START_1', type: 'Start', next: 'DECISION_1' },
        {
          id: 'DECISION_1',
          type: 'Decision',
          outcomes: [
            { name: 'Yes', next: 'END_1', isDefault: false },
            { name: 'No', next: 'END_1', isDefault: true },
          ],
        },
        { id: 'END_1', type: 'End' },
      ],
    };

    const metrics = analyzer.analyze(dsl);
    expect(metrics.cyclomaticComplexity).toBe(2); // 1 decision + 1
    expect(metrics.complexityLevel).toBe(ComplexityLevel.LOW);
  });
});
```

---

## 📁 Estructura de Archivos

```
src/
├── cli/
│   └── commands/
│       └── explain.ts              # NUEVO - Comando CLI
├── explainer/                       # NUEVO - Módulo completo
│   ├── flow-explainer.ts           # Main explainer class
│   ├── complexity-analyzer.ts      # Análisis de complejidad
│   ├── recommendation-engine.ts    # Generación de recomendaciones
│   └── output-formatters.ts        # Formatters (text, json, html)
├── types/
│   └── explainer.ts                # NUEVO - Type definitions
└── __tests__/
    ├── flow-explainer.test.ts      # NUEVO - Tests principales
    ├── complexity-analyzer.test.ts # NUEVO - Tests de complejidad
    └── recommendation-engine.test.ts # NUEVO - Tests de recomendaciones
```

---

## 🔧 Dependencias Adicionales

**Ninguna nueva dependencia externa requerida** - Todo se puede implementar con:
- TypeScript estándar
- Tipos existentes del proyecto
- Utilidades existentes (FlowDSL, ValidationResult, etc.)

---

## 📊 Métricas de Éxito

| Métrica | Objetivo | Verificación |
|---------|----------|--------------|
| Tests escritos | 15+ | `npm test` pasa |
| Formatos soportados | 3 (text, json, html) | CLI acepta --format |
| Anti-patterns detectados | 6+ | RecommendationEngine tests |
| Complejidad calculada | Correcta | ComplexityAnalyzer tests |
| Documentación | Completa | README actualizado |

---

## 🎯 Beneficios

1. **Para Desarrolladores**:
   - Entender flows existentes rápidamente
   - Detectar problemas antes de deployar
   - Obtener métricas de calidad

2. **Para Code Reviews**:
   - Reporte automático de complejidad
   - Detección de anti-patterns
   - Sugerencias de mejora

3. **Para Documentación**:
   - Generación automática de resúmenes
   - Export a múltiples formatos
   - Métricas cuantificables

---

## 📝 Ejemplo de Uso

```bash
# Analizar un flow
mermaid-flow-compile explain --input examples/v1/complete-flow.mmd

# Generar reporte JSON
mermaid-flow-compile explain --input my-flow.mmd --format json --output report.json

# Análisis detallado
mermaid-flow-compile explain --input my-flow.mmd --verbose
```

---

## 🚀 Próximos Pasos (Después de 3.1)

Una vez completada TASK 3.1, se puede continuar con:
- **TASK 3.2**: AI Pipeline Integration (DSPy/MiPRO)
- **TASK 3.3**: Interactive CLI Mode
- **TASK 2.8**: CI/CD Integration (pendiente de Phase 2)

---

## 📚 Referencias

- [Cyclomatic Complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
- [Code Metrics Best Practices](https://docs.microsoft.com/en-us/visualstudio/code-quality/code-metrics-values)
- [Salesforce Flow Best Practices](https://help.salesforce.com/s/articleView?id=sf.flow_prep_bestpractices.htm)
