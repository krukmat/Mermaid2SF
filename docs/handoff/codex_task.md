# CODEX HANDOFF - EJECUCIÓN DEL PLAN DE REFACTORING

**PRIORITY: HIGH**

# Optional override:
CODEX_MODEL: gpt-5.2-codex

## Goal

Ejecutar el plan de refactoring aprobado para los scripts críticos identificados en el análisis de complejidad, aplicando patrones de diseño y principios SOLID para mejorar mantenibilidad y escalabilidad del proyecto Mermaid2SF.

## Estado Actual

**Plan de refactoring**: APROBADO por el usuario
**Módulos críticos identificados**: 5 módulos con alta/muy alta complejidad
**Estrategias definidas**: 6 patrones de diseño específicos
**Cronograma**: 3 sprints definidos

## Módulos a Refactorizar

### 🔴 Prioridad 1 (Complejidad ALTA):
1. **`generators/flow-xml-generator.ts`** - 592 líneas
   - **Problema**: Función `generateXML()` monolítica de 200+ líneas
   - **Solución**: Strategy Pattern + Factory Pattern
   - **Archivos resultantes**: 8-10 clases especializadas

2. **`generators/docs-generator.ts`** - 494 líneas
   - **Problema**: Generación y renderizado mezclados
   - **Solución**: Template Method Pattern + Separación de responsabilidades
   - **Archivos resultantes**: 6-8 clases especializadas

### 🟡 Prioridad 2 (Complejidad MEDIA):
3. **`extractor/metadata-extractor.ts`** - 373 líneas
4. **`reverse/xml-parser.ts`** - 364 líneas
5. **`validator/flow-validator.ts`** - 354 líneas

## Archivos a Crear/Modificar

### **Sprint 1: Módulos Prioridad Alta**

#### **flow-xml-generator.ts** → Refactoring completo:
- `src/generators/xml/XMLGenerator.ts` (clase principal)
- `src/generators/xml/strategies/ElementStrategy.ts` (interface)
- `src/generators/xml/strategies/ScreenStrategy.ts`
- `src/generators/xml/strategies/AssignmentStrategy.ts`
- `src/generators/xml/strategies/DecisionStrategy.ts`
- `src/generators/xml/factories/GeneratorFactory.ts`
- `src/generators/xml/components/HeaderGenerator.ts`
- `src/generators/xml/components/ElementGenerator.ts`
- `src/generators/xml/components/ConnectorGenerator.ts`
- `src/generators/xml/components/FooterGenerator.ts`

#### **docs-generator.ts** → Refactoring completo:
- `src/generators/docs/DocsGenerator.ts` (clase principal)
- `src/generators/docs/templates/DocumentationTemplate.ts` (abstract)
- `src/generators/docs/templates/TechnicalDocumentationTemplate.ts`
- `src/generators/docs/renderers/DiagramRenderer.ts`
- `src/generators/docs/formatters/DocumentationFormatter.ts`

### **Sprint 2: Módulos Prioridad Media**

#### **metadata-extractor.ts** → Refactoring:
- `src/extractor/handlers/ExtractionHandler.ts` (interface)
- `src/extractor/handlers/ScreenExtractionHandler.ts`
- `src/extractor/handlers/AssignmentExtractionHandler.ts`
- `src/extractor/handlers/DecisionExtractionHandler.ts`

#### **xml-parser.ts** → Refactoring:
- `src/reverse/parsers/XMLParseable.ts` (interface)
- `src/reverse/parsers/CompositeXMLParser.ts`
- `src/reverse/parsers/ScreenXMLParser.ts`
- `src/reverse/parsers/AssignmentXMLParser.ts`

#### **flow-validator.ts** → Refactoring:
- `src/validator/visitors/FlowElementVisitor.ts` (interface)
- `src/validator/visitors/ValidationVisitor.ts`
- `src/validator/elements/ScreenElement.ts`
- `src/validator/elements/AssignmentElement.ts`
- `src/validator/elements/DecisionElement.ts`

## Commands to run

```bash
# Verificar estado inicial
npm test -- --silent --passWithNoTests

# Ejecutar con cobertura antes del refactoring
npm test -- --coverage

# Testing durante desarrollo
npm run test -- --watch

# Testing de integración
npm run test -- --testPathPatterns="integration"

# Verificar cobertura después de cada sprint
npm test -- --coverage --collectCoverageFrom="src/generators/xml/**/*.ts"
npm test -- --coverage --collectCoverageFrom="src/generators/docs/**/*.ts"

# Linting y formatting
npm run lint
npm run format

# Compilación
npm run build

# CI completo
npm run ci
```

## Acceptance criteria

1. **Funcionalidad preservada**: Todos los tests existentes deben seguir pasando
2. **Complejidad reducida**: 
   - flow-xml-generator.ts: 592 líneas → <200 líneas por clase
   - docs-generator.ts: 494 líneas → <200 líneas por clase
   - Complejidad ciclomática <10 por función
3. **Cobertura mantenida**: >85% en módulos refactorizados
4. **Compatibilidad hacia atrás**: API existente sin breaking changes
5. **Tests adicionales**: Tests específicos para nuevos patrones implementados
6. **Performance**: No degradación de performance significativa

## Estrategia de Implementación

### **Phase 1: Backup y Setup (30 minutos)**
1. Crear backup del estado actual
2. Configurar branch para refactoring
3. Verificar tests baseline

### **Phase 2: Sprint 1 - flow-xml-generator.ts (2-3 días)**
1. **Día 1**: Crear estructura de directorios y interfaces
2. **Día 2**: Implementar Strategy Pattern para elementos
3. **Día 3**: Implementar Factory Pattern y testing
4. **Día 4**: Migración gradual y testing
5. **Día 5**: Validación y optimización

### **Phase 3: Sprint 2 - docs-generator.ts (2 días)**
1. **Día 1**: Implementar Template Method Pattern
2. **Día 2**: Separación renderizado/generación
3. **Día 3**: Testing y validación

### **Phase 4: Sprint 3 - Módulos Prioridad Media (2-3 días)**
1. **Día 1**: metadata-extractor.ts (Chain of Responsibility)
2. **Día 2**: xml-parser.ts (Composite Pattern)
3. **Día 3**: flow-validator.ts (Visitor Pattern)

### **Phase 5: Integración y Testing (1-2 días)**
1. Testing de integración end-to-end
2. Validación de performance
3. Documentación final

## Rollback plan

- **Backup inicial**: git stash antes de empezar
- **Migración gradual**: Implementar patrones sin eliminar código original
- **Testing continuo**: Verificar funcionalidad en cada paso
- **Branching strategy**: Crear rama `refactoring/2026-01-02` para desarrollo
- **Merge strategy**: Merge con squash para mantener historial limpio

## Risk Mitigation

### **Riesgo: Breaking Changes**
- **Mitigación**: Mantener interfaces originales, crear nuevas implementaciones
- **Verificación**: Tests de compatibilidad automática

### **Riesgo: Performance Degradation**
- **Mitigación**: Benchmarking antes y después de cada sprint
- **Verificación**: Tests de performance específicos

### **Riesgo: Testing Coverage Reduction**
- **Mitigación**: Estrategia de testing robusto implementada desde el inicio
- **Verificación**: Monitoreo continuo de cobertura

### **Riesgo: Complex Dependencies**
- **Mitigación**: Implementación incremental con validación en cada paso
- **Verificación**: Testing de integración continuo

## Context importante

Este refactoring es crítico para:
- **Mantenibilidad**: Código más fácil de entender y modificar
- **Escalabilidad**: Facilitar adición de nuevos tipos de elementos
- **Testing**: Mayor facilidad para crear tests específicos
- **Performance**: Mejor uso de memoria y procesamiento

El proyecto es un compilador de flows de Mermaid a Salesforce Flow XML, por lo que la estabilidad y confiabilidad son fundamentales.

## Estimación de Esfuerzo

**Total**: 8-10 días de desarrollo
- **Sprint 1**: 4-5 días (flow-xml-generator.ts + docs-generator.ts)
- **Sprint 2**: 2-3 días (3 módulos restantes)
- **Sprint 3**: 2 días (integración y testing)

**Priority**: ALTA - Impacto significativo en mantenibilidad del proyecto
