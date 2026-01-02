# CODEX HANDOFF - REFACTORIZACIÓN COMPLEJIDAD CICLOMÁTICA

**PRIORITY: HIGH**

## Goal

Refactorizar archivos de alta complejidad ciclomática identificados en Sprint 2 para reducir complejidad y mejorar mantenibilidad del código.

## Non-goals

- Cambiar APIs públicas existentes
- Modificar funcionalidad de negocio
- Refactorizar archivos fuera de los identificados

## Files to change

**CRITICAL (Priority 1):**
- src/validator/visitors/ValidationVisitor.ts (92 líneas, CC ~8-10)

**MEDIUM (Priority 2):**
- src/reverse/parsers/CompositeXMLParser.ts (54 líneas, CC ~2-3)

**LOW (Priority 3):**
- src/reverse/parsers/ScreenXMLParser.ts (44 líneas, CC ~2-3)

## Proposed steps

### Step 1: ValidationVisitor.ts Refactor (CRITICAL)
1. Crear strategy pattern para validaciones:
   - src/validator/visitors/strategies/ScreenValidationStrategy.ts
   - src/validator/visitors/strategies/AssignmentValidationStrategy.ts
   - src/validator/visitors/strategies/DecisionValidationStrategy.ts
   - src/validator/visitors/strategies/LoopValidationStrategy.ts

2. Crear validation registry:
   - src/validator/visitors/ValidationRegistry.ts

3. Refactor ValidationVisitor.ts:
   - Eliminar if/else chain
   - Usar strategy registry
   - Extraer error handler
   - Reducir de 92 líneas a <50 líneas

### Step 2: CompositeXMLParser.ts Refactor (MEDIUM)
1. Extraer parser registry:
   - src/reverse/parsers/ParserRegistry.ts

2. Simplificar error handling:
   - Validación en constructor
   - Eliminar checks repetitivos

### Step 3: ScreenXMLParser.ts Refactor (LOW)
1. Extraer métodos auxiliares
2. Reducir duplicación de código

## Commands to run

- `npm run build` (verificar compilación)
- `npm test` (verificar que tests pasan)
- `npm run lint` (verificar linting)

## Acceptance criteria

- ValidationVisitor.ts: CC <5, líneas <50
- CompositeXMLParser.ts: CC <3, líneas <40
- ScreenXMLParser.ts: CC <3, líneas <35
- Todos los tests pasan
- No breaking changes en APIs públicas
- Compilación sin errores
- Linting sin errores críticos

## Rollback plan

- Backup de archivos originales ya existe con sufijo `-original.ts`
- Restoration: `cp src/*-original.ts src/*.ts` para revertir cambios

## Pattern recommendations

1. **Strategy Pattern** para ValidationVisitor
2. **Registry Pattern** para parsers
3. **Helper Functions** para código duplicado

## Technical details

### ValidationVisitor.ts problems:
- Método visit(): 4 if/else + try/catch (CC ~8-10)
- Validación duplicada en 4 métodos similares
- Error handling repetitivo
- Violación Single Responsibility

### CompositeXMLParser.ts problems:
- Validación repetitiva de parser existence
- findCompatibleParser() inline
- Null checks repetitivos

### ScreenXMLParser.ts problems:
- parseFields() y parseConnectors() muy similares
- Lógica de parsing repetitiva
- Métodos auxiliares podrían extraerse

