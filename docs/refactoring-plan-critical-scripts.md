# PLAN DE REFACTORING - SCRIPTS CRÍTICOS

## 📋 OBJETIVO

Reducir la complejidad ciclomática de los módulos críticos identificados en el análisis, aplicando patrones de diseño y principios SOLID para mejorar mantenibilidad y escalabilidad.

## 🎯 MÓDULOS CRÍTICOS IDENTIFICADOS

### 🔴 COMPLEJIDAD ALTA (Prioridad 1)
1. **`generators/flow-xml-generator.ts`** - 592 líneas
2. **`generators/docs-generator.ts`** - 494 líneas

### 🟡 COMPLEJIDAD MEDIA (Prioridad 2)
3. **`extractor/metadata-extractor.ts`** - 373 líneas
4. **`reverse/xml-parser.ts`** - 364 líneas
5. **`validator/flow-validator.ts`** - 354 líneas

## 📊 PLAN DE REFACTORING DETALLADO

### 🔥 PRIORIDAD 1: flow-xml-generator.ts (592 líneas)

#### **Problemas Identificados:**
- Función `generateXML()` demasiado grande
- Múltiples if/switch para diferentes tipos de elementos
- Lógica de generación XML mezclada
- Dificultad para testear y mantener

#### **Estrategia de Refactoring:**

**Fase 1: Separación de Responsabilidades (2-3 horas)**

```typescript
// ANTES: Una función monolítica
function generateXML(flow: FlowDSL): string {
  // 200+ líneas de lógica mezclada
}

// DESPUÉS: Funciones especializadas
class XMLGenerator {
  private headerGenerator: HeaderGenerator
  private elementGenerator: ElementGenerator
  private connectorGenerator: ConnectorGenerator
  private footerGenerator: FooterGenerator

  generate(flow: FlowDSL): string {
    return [
      this.headerGenerator.generate(flow),
      this.elementGenerator.generate(flow.elements),
      this.connectorGenerator.generate(flow.connectors),
      this.footerGenerator.generate(flow)
    ].join('\n')
  }
}
```

**Fase 2: Patrón Strategy para Elementos (2 horas)**

```typescript
interface ElementStrategy {
  generate(element: FlowElement): string
}

class ScreenStrategy implements ElementStrategy {
  generate(element: FlowElement): string {
    // Lógica específica para Screen
  }
}

class AssignmentStrategy implements ElementStrategy {
  generate(element: FlowElement): string {
    // Lógica específica para Assignment
  }
}

class DecisionStrategy implements ElementStrategy {
  generate(element: FlowElement): string {
    // Lógica específica para Decision
  }
}

class ElementGenerator {
  private strategies: Map<string, ElementStrategy> = new Map()

  constructor() {
    this.strategies.set('Screen', new ScreenStrategy())
    this.strategies.set('Assignment', new AssignmentStrategy())
    this.strategies.set('Decision', new DecisionStrategy())
  }

  generate(element: FlowElement): string {
    const strategy = this.strategies.get(element.type)
    if (!strategy) {
      throw new Error(`Unknown element type: ${element.type}`)
    }
    return strategy.generate(element)
  }
}
```

**Fase 3: Factory Pattern para Generators (1 hora)**

```typescript
interface GeneratorFactory {
  createXMLGenerator(): XMLGenerator
  createElementGenerator(): ElementGenerator
  createConnectorGenerator(): ConnectorGenerator
}

class DefaultGeneratorFactory implements GeneratorFactory {
  createXMLGenerator(): XMLGenerator {
    return new XMLGenerator(
      this.createHeaderGenerator(),
      this.createElementGenerator(),
      this.createConnectorGenerator(),
      this.createFooterGenerator()
    )
  }

  private createHeaderGenerator(): HeaderGenerator {
    return new HeaderGenerator()
  }

  private createElementGenerator(): ElementGenerator {
    return new ElementGenerator()
  }

  private createConnectorGenerator(): ConnectorGenerator {
    return new ConnectorGenerator()
  }

  private createFooterGenerator(): FooterGenerator {
    return new FooterGenerator()
  }
}
```

#### **Archivos Resultantes:**
- `generators/xml/XMLGenerator.ts` (clase principal)
- `generators/xml/strategies/` (patrones para elementos)
- `generators/xml/factories/` (factory pattern)
- `generators/xml/components/` (componentes especializados)

---

### 🔥 PRIORIDAD 1: docs-generator.ts (494 líneas)

#### **Problemas Identificados:**
- Función `generateMarkdown()` muy compleja
- Renderizado de diagramas Mermaid mezclado con generación de docs
- Lógica de formateo dispersa

#### **Estrategia de Refactoring:**

**Fase 1: Separación de Generación y Renderizado (2 horas)**

```typescript
// ANTES: Responsabilidades mezcladas
class DocsGenerator {
  generateMarkdown(flow: FlowDSL): string {
    // Lógica de documentación + renderizado de diagramas
  }
}

// DESPUÉS: Responsabilidades separadas
class MarkdownGenerator {
  private diagramRenderer: DiagramRenderer
  private formatter: DocumentationFormatter

  generate(flow: FlowDSL): string {
    const documentation = this.createDocumentation(flow)
    const diagrams = this.diagramRenderer.render(flow)
    return this.formatter.format(documentation, diagrams)
  }
}

class DiagramRenderer {
  render(flow: FlowDSL): string[] {
    return flow.elements
      .filter(element => element.type === 'Mermaid')
      .map(element => this.renderMermaidDiagram(element))
  }

  private renderMermaidDiagram(element: FlowElement): string {
    // Lógica específica de renderizado
  }
}
```

**Fase 2: Template Method Pattern (1 hora)**

```typescript
abstract class DocumentationTemplate {
  generate(flow: FlowDSL): string {
    return [
      this.generateHeader(flow),
      this.generateContent(flow),
      this.generateFooter(flow)
    ].join('\n\n')
  }

  protected abstract generateHeader(flow: FlowDSL): string
  protected abstract generateContent(flow: FlowDSL): string
  protected abstract generateFooter(flow: FlowDSL): string
}

class TechnicalDocumentationTemplate extends DocumentationTemplate {
  protected generateHeader(flow: FlowDSL): string {
    return `# Technical Documentation: ${flow.name}`
  }

  protected generateContent(flow: FlowDSL): string {
    // Lógica específica técnica
  }

  protected generateFooter(flow: FlowDSL): string {
    return `Generated on: ${new Date().toISOString()}`
  }
}
```

#### **Archivos Resultantes:**
- `generators/docs/DocsGenerator.ts` (clase principal)
- `generators/docs/templates/` (templates especializados)
- `generators/docs/renderers/` (renderers de diagramas)
- `generators/docs/formatters/` (formatters)

---

### 🔶 PRIORIDAD 2: metadata-extractor.ts (373 líneas)

#### **Estrategia de Refactoring:**

**Fase 1: Chain of Responsibility (1.5 horas)**

```typescript
interface ExtractionHandler {
  setNext(handler: ExtractionHandler): ExtractionHandler
  extract(node: MermaidNode): Metadata | null
}

abstract class BaseExtractionHandler implements ExtractionHandler {
  private nextHandler: ExtractionHandler | null = null

  setNext(handler: ExtractionHandler): ExtractionHandler {
    this.nextHandler = handler
    return handler
  }

  extract(node: MermaidNode): Metadata | null {
    if (this.canHandle(node)) {
      return this.doExtract(node)
    }
    return this.nextHandler?.extract(node) || null
  }

  protected abstract canHandle(node: MermaidNode): boolean
  protected abstract doExtract(node: MermaidNode): Metadata
}

class ScreenExtractionHandler extends BaseExtractionHandler {
  protected canHandle(node: MermaidNode): boolean {
    return node.type === 'Screen'
  }

  protected doExtract(node: MermaidNode): Metadata {
    // Lógica específica de extracción para Screen
  }
}
```

---

### 🔶 PRIORIDAD 2: xml-parser.ts (364 líneas)

#### **Estrategia de Refactoring:**

**Fase 1: Composite Pattern (1.5 horas)**

```typescript
interface XMLParseable {
  parse(xmlElement: Element): void
}

class CompositeXMLParser implements XMLParseable {
  private parsers: XMLParseable[] = []

  addParser(parser: XMLParseable): void {
    this.parsers.push(parser)
  }

  parse(xmlElement: Element): void {
    this.parsers.forEach(parser => {
      if (this.canParse(parser, xmlElement)) {
        parser.parse(xmlElement)
      }
    })
  }

  private canParse(parser: XMLParseable, element: Element): boolean {
    // Lógica para determinar si el parser puede manejar el elemento
  }
}
```

---

### 🔶 PRIORIDAD 2: flow-validator.ts (354 líneas)

#### **Estrategia de Refactoring:**

**Fase 1: Visitor Pattern (1.5 horas)**

```typescript
interface FlowElementVisitor {
  visitScreen(element: ScreenElement): ValidationResult
  visitAssignment(element: AssignmentElement): ValidationResult
  visitDecision(element: DecisionElement): ValidationResult
}

interface FlowElement {
  accept(visitor: FlowElementVisitor): ValidationResult
}

class ScreenElement implements FlowElement {
  accept(visitor: FlowElementVisitor): ValidationResult {
    return visitor.visitScreen(this)
  }
}

class ValidationVisitor implements FlowElementVisitor {
  visitScreen(element: ScreenElement): ValidationResult {
    // Lógica de validación específica para Screen
  }

  visitAssignment(element: AssignmentElement): ValidationResult {
    // Lógica de validación específica para Assignment
  }

  visitDecision(element: DecisionElement): ValidationResult {
    // Lógica de validación específica para Decision
  }
}
```

## 📋 PLAN DE IMPLEMENTACIÓN

### **Sprint 1 (1 semana): Prioridad Alta**
- **Día 1-2**: Refactoring flow-xml-generator.ts
- **Día 3-4**: Refactoring docs-generator.ts
- **Día 5**: Testing y validación

### **Sprint 2 (1 semana): Prioridad Media**
- **Día 1-2**: Refactoring metadata-extractor.ts
- **Día 3-4**: Refactoring xml-parser.ts
- **Día 5**: Refactoring flow-validator.ts

### **Sprint 3 (3 días): Integración y Optimización**
- **Día 1**: Testing de integración
- **Día 2**: Optimización de performance
- **Día 3**: Documentación final

## 🧪 TESTING STRATEGY

### **Tests de Unidad Reforzada:**
```typescript
// Ejemplo para XMLGenerator
describe('XMLGenerator', () => {
  let generator: XMLGenerator
  let mockStrategies: Map<string, ElementStrategy>

  beforeEach(() => {
    mockStrategies = new Map([
      ['Screen', mockElementStrategy],
      ['Assignment', mockElementStrategy]
    ])
    generator = new XMLGenerator(mockStrategies)
  })

  it('should generate XML for simple flow', () => {
    const flow = createSimpleFlow()
    const result = generator.generate(flow)
    expect(result).toMatch(/<Flow>/)
  })

  it('should handle unknown element types', () => {
    const flow = createFlowWithUnknownElement()
    expect(() => generator.generate(flow)).toThrow()
  })
})
```

### **Tests de Integración:**
```typescript
describe('Generator Integration', () => {
  it('should generate consistent XML and docs', () => {
    const flow = createComplexFlow()
    const xmlGenerator = new XMLGenerator()
    const docsGenerator = new DocsGenerator()
    
    const xml = xmlGenerator.generate(flow)
    const docs = docsGenerator.generate(flow)
    
    expect(xml).toBeValidXML()
    expect(docs).toContainFlowReferences(flow.elements)
  })
})
```

## 📊 MÉTRICAS DE ÉXITO

### **Antes del Refactoring:**
- **flow-xml-generator.ts**: 592 líneas, complejidad muy alta
- **docs-generator.ts**: 494 líneas, complejidad muy alta

### **Después del Refactoring:**
- **Clases individuales**: <200 líneas cada una
- **Complejidad ciclomática**: <10 por función
- **Cobertura de tests**: >90%
- **Tiempo de mantenimiento**: Reducción del 50%

## 🚀 BENEFICIOS ESPERADOS

### **Mantenibilidad:**
- Código más fácil de entender y modificar
- Responsabilidades claras y separadas
- Mayor facilidad para testing

### **Escalabilidad:**
- Fácil agregar nuevos tipos de elementos
- Patrones reutilizables
- Extensibilidad mejorada

### **Performance:**
- Mejor uso de memoria
- Procesamiento más eficiente
- Reducción de complejidad temporal

## ⚠️ RIESGOS Y MITIGACIÓN

### **Riesgo: Breaking Changes**
- **Mitigación**: Migración gradual con compatibilidad hacia atrás

### **Riesgo: Performance Degradation**
- **Mitigación**: Benchmarking antes y después

### **Riesgo: Testing Coverage Reduction**
- **Mitigación**: Estrategia de testing robusta implementada

---

**Plan creado**: 2026-01-02 17:38:34  
**Próxima revisión**: Después de Sprint 1  
**Responsable**: Equipo de Desarrollo
