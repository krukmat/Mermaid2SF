# CODEX HANDOFF - CORRECCIÓN COMPLETA DE TESTS

**PRIORITY: HIGH**

## Goal

Completar la corrección de los tests fallando en el proyecto Mermaid2SF, alcanzando los objetivos de:
- Cobertura global > 80%
- Cobertura individual > 85%
- Tests funcionando al 100%
- Análisis de complejidad ciclomática

## Non-goals

- No modificar arquitectura fundamental del proyecto
- No reescribir módulos existentes sin necesidad
- No crear tests innecesarios para funcionalidad ya cubierta

## Estado Actual

**Tests ejecutándose**: 158 de 158 (100%)
**Test suites**: 20 de 20 funcionando (100%)
**Tests fallando**: 0 test suites
**Estado**: Tests funcionando correctamente, pendiente mejora de cobertura

## Progreso Realizado por Codex

### ✅ Completado Exitosamente:
1. **Tests funcionando**: Mejorados de 120/120 a 158/158 tests
2. **Test suites**: Mejoradas de 17/20 a 20/20 funcionando
3. **Tests CLI**: Reestructurados sin dependencias del framework Commander
4. **Herramientas instaladas**: Plato y escomplex para análisis de complejidad
5. **Regex corregidos**: Tipos SCREEN, FAULT, etc. ahora reconocidos
6. **Types corregidos**: Errores de parámetros resueltos

### 📊 Cobertura Actual vs Objetivos:
- **Statements**: 58.26% (objetivo 80%) - Gap: -21.74%
- **Branches**: 49.73% (objetivo 80%) - Gap: -30.27%
- **Lines**: 58.53% (objetivo 80%) - Gap: -21.47%
- **Functions**: 67.54% (objetivo 80%) - Gap: -12.46%

## Módulos con Cobertura Excelente (>85%)

| Módulo | Cobertura | Estado |
|--------|-----------|--------|
| test-generator/script-generator.ts | 100% | Perfecto |
| validator/flow-validator.ts | 95.62% | Excelente |
| validator/schema-validator.ts | 93.75% | Excelente |
| test-generator/path-analyzer.ts | 92% | Excelente |
| parser/mermaid-parser.ts | 83.07% | Cerca del objetivo |

## Módulos Críticos con Baja Cobertura (0-20%)

| Módulo | Cobertura | Acción Requerida |
|--------|-----------|------------------|
| cli/commands/decompile.ts | 0% | Crear tests completos |
| cli/commands/lint.ts | 0% | Tests de validación |
| cli/commands/test-plan.ts | 0% | Tests de generación |
| cli/index.ts | 0% | Tests de entrada principal |
| cli/utils/flow-validation.ts | 16.66% | Ampliar tests |

## Tasks Pendientes para Alcanzar 80% Cobertura

### Phase 1: Tests para Módulos CLI Críticos (3-4 horas)
1. **Crear cli/commands/decompile.test.ts**
   - Tests de comando de decompilación
   - Validación de entrada y salida
   - Manejo de errores

2. **Crear cli/commands/lint.test.ts**
   - Tests de validación de archivos
   - Tests de diferentes tipos de validación
   - Tests de configuración

3. **Crear cli/commands/test-plan.test.ts**
   - Tests de generación de planes
   - Tests de análisis de paths
   - Tests de generación de datos

4. **Crear cli/index.test.ts**
   - Tests de punto de entrada principal
   - Tests de routing de comandos
   - Tests de manejo de argumentos

### Phase 2: Mejora de Cobertura en Módulos Existentes (2-3 horas)
1. **Ampliar cli/commands/compile.test.ts**
   - De 12.4% → 50%+ cobertura
   - Más casos de prueba de validación
   - Tests de diferentes escenarios de compilación

2. **Mejorar cli/utils/flow-validation.ts**
   - De 16.66% → 70%+ cobertura
   - Tests de funciones de utilidad
   - Tests de validación de flujos

3. **Ampliar reverse/xml-parser.test.ts**
   - De 41.71% → 70%+ cobertura
   - Más casos de parsing XML
   - Tests de diferentes estructuras XML

### Phase 3: Refactoring de Complejidad (1-2 horas)
1. **Dividir funciones complejas**
   - flow-xml-generator.ts (592 líneas)
   - docs-generator.ts (494 líneas)
   - Aplicar principio de responsabilidad única

2. **Aplicar patrones de diseño**
   - Strategy pattern para generadores
   - Factory pattern para parsers
   - Template method para validaciones

## Files to change

- `src/__tests__/cli/decompile.test.ts` - Crear (nuevo archivo)
- `src/__tests__/cli/lint.test.ts` - Crear (nuevo archivo)
- `src/__tests__/cli/test-plan.test.ts` - Mejorar cobertura existente
- `src/__tests__/cli/index.test.ts` - Crear (nuevo archivo)
- `src/__tests__/cli/compile.test.ts` - Ampliar cobertura existente
- `src/__tests__/cli/utils/flow-validation.test.ts` - Crear si no existe
- `src/generators/flow-xml-generator.ts` - Refactoring de complejidad
- `src/generators/docs-generator.ts` - Refactoring de complejidad

## Commands to run

```bash
# Verificar estado actual
npm test -- --silent --passWithNoTests

# Ejecutar con cobertura
npm test -- --coverage

# Verificar cobertura específica
npm test -- --coverage --collectCoverageFrom="src/cli/**/*.ts"
npm test -- --coverage --collectCoverageFrom="src/generators/**/*.ts"

# Análisis de complejidad
npx plato -d complexity-reports src/**/*.ts
```

## Acceptance criteria

1. **Tests funcionando**: 158/158 tests pasando ✅
2. **Cobertura global**: >80% en todas las métricas ❌ (actual: 58.26% statements)
3. **Cobertura individual**: >85% en módulos críticos ❌ (5 módulos <20%)
4. **0 tests fallando**: Todas las test suites funcionando ✅
5. **Análisis de complejidad**: Herramientas instaladas ✅
6. **Refactoring**: Funciones complejas divididas ❌

## Gap Remaining

- **Coverage gap**: ~22% para alcanzar 80% global
- **Modules to test**: 5 módulos CLI sin tests
- **Complexity refactoring**: 8 módulos con alta complejidad
- **Estimated effort**: 6-8 horas de trabajo

## Rollback plan

- Backup actual: `git stash` antes de cambios mayores
- Restaurar archivos específicos si hay problemas
- Mantener cambios exitosos en ramas separadas
- Rollback a commit anterior si es necesario

## Context importante

Este proyecto es un compilador de flows de Mermaid a Salesforce Flow XML. Los tests son críticos para:
- Validar parsing correcto de diagramas Mermaid
- Verificar generación de XML válido para Salesforce
- Asegurar compatibilidad con diferentes tipos de elementos (Screen, Assignment, Decision, etc.)
- Mantener integridad en el pipeline de conversión

La corrección de estos tests es esencial para la confiabilidad del sistema de conversión.

**Estado actual**: Codex logró un éxito parcial - todos los tests funcionan pero falta alcanzar cobertura del 80%.
