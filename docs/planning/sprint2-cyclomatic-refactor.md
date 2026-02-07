# Sprint 2 Cyclomatic Refactor Plan

## Objective
Reduce cyclomatic complexity for the specified Sprint 2 files while preserving public APIs and behavior.

## Scope
- `src/validator/visitors/ValidationVisitor.ts`
- `src/reverse/parsers/CompositeXMLParser.ts`
- `src/reverse/parsers/ScreenXMLParser.ts`

## Plan
1. Refactor `ValidationVisitor.ts` using Strategy + Registry to remove conditional chains.
2. Refactor `CompositeXMLParser.ts` with a parser registry to simplify lookups and errors.
3. Refactor `ScreenXMLParser.ts` by extracting helpers to remove duplication.
4. Run `npm run build`, `npm test`, and `npm run lint`.
5. Update `PROJECT_PLAN.md` with Sprint 2 refactor status and project map.

## Acceptance Checks
- `ValidationVisitor.ts` CC < 5, < 50 lines.
- `CompositeXMLParser.ts` CC < 3, < 40 lines.
- `ScreenXMLParser.ts` CC < 3, < 35 lines.
- Tests, build, and lint pass without critical errors.
